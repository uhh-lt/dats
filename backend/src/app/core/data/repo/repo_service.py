import json
import os
import shutil
import urllib.parse as url
import uuid
import zipfile
from http.client import BAD_REQUEST
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from zipfile import ZipFile

import magic
import pandas as pd
from config import conf
from fastapi import HTTPException, UploadFile
from loguru import logger

from app.core.data.doc_type import DocType, get_doc_type
from app.core.data.dto.source_document import (
    SDOC_FILENAME_MAX_LENGTH,
    SDOC_SUFFIX_MAX_LENGTH,
    SDocStatus,
    SourceDocumentCreate,
    SourceDocumentRead,
)
from app.util.singleton_meta import SingletonMeta

# TODO Flo: Currently only supports localhost but in future it could be that processes running on a different host use
#           this service...


class SourceDocumentNotFoundInRepositoryError(Exception):
    def __init__(self, sdoc: SourceDocumentRead, dst: Union[str, Path]):
        super().__init__(
            (
                f"The original file of SourceDocument {sdoc.id} ({sdoc.filename}) cannot be found in "
                f"the DATS Repository at {dst}"
            )
        )


class FileNotFoundInRepositoryError(Exception):
    def __init__(self, proj_id: int, filename: Union[str, Path], dst: Union[str, Path]):
        super().__init__(
            f"The file '{filename}' of Project {proj_id} cannot be found in the DATS Repository at {dst}"
        )


class FileAlreadyExistsInRepositoryError(Exception):
    def __init__(self, proj_id: int, filename: Union[str, Path], dst: str):
        super().__init__(
            f"Cannot store the file '{filename}' of Project {proj_id} because there is a file with the "
            f"same name in the DATS Repository at {dst}"
        )


class ProjectAlreadyExistsInRepositoryError(Exception):
    def __init__(self, proj_id: int):
        super().__init__(
            f"Cannot create directory structure for Project {proj_id} because it already exists!"
        )


class UnsupportedDocTypeForSourceDocument(Exception):
    def __init__(self, dst_path: Path):
        super().__init__(
            f"Unsupported DocType! Cannot create SourceDocument from file {dst_path}."
        )


class ErroneousArchiveException(Exception):
    def __init__(self, archive_path: Path, msg: Optional[str] = None):
        super().__init__(
            f"Error with Archive {archive_path}{' :' + msg if msg else ''}"
        )


class RepoService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        repo_root = Path(conf.repo.root_directory)
        logger.info(f"Using repo root {repo_root}")
        cls.repo_root = repo_root
        cls.temp_files_root = repo_root.joinpath("temporary_files")
        cls.logs_root = repo_root.joinpath("logs")
        cls.proj_root = repo_root.joinpath("projects")

        # setup base url where the content server can be reached
        base_url = "https://" if conf.repo.content_server.https else "http://"
        base_url += conf.repo.content_server.host + ":"
        base_url += str(conf.repo.content_server.port)
        base_url += conf.repo.content_server.context_path
        cls.base_url = base_url

        return super(RepoService, cls).__new__(cls)

    @staticmethod
    def truncate_filename(filename: Union[str, Path]) -> str:
        # convert to path if str
        filename = Path(filename)
        if len(filename.name) > SDOC_FILENAME_MAX_LENGTH + SDOC_SUFFIX_MAX_LENGTH:
            logger.warning(
                f'Filename "{filename.name}" is too long and gets truncated!'
            )
            # we want to keep the last three suffixes (if they exist)
            suffix = "".join(filename.suffixes[-3:])[-SDOC_SUFFIX_MAX_LENGTH:]
            filename = filename.with_name(
                # remove the suffixes to only truncate the true name / stem
                # and then truncate to max length
                filename.name.removesuffix(suffix)[:SDOC_FILENAME_MAX_LENGTH]
            ).with_suffix(suffix)  # and add suffix again
        return str(filename)

    def _create_root_repo_directory_structure(self, remove_if_exists: bool = False):
        try:
            if self.repo_root.exists() and remove_if_exists:
                logger.warning(f"Removing DATS Repo at {self.repo_root}")
                for filename in self.repo_root.iterdir():
                    file_path = self.repo_root.joinpath(self.repo_root, filename)
                    try:
                        if file_path.is_file() or file_path.is_symlink():
                            os.unlink(file_path)
                        elif file_path.is_dir():
                            shutil.rmtree(file_path)
                    except Exception as e:
                        logger.error(f"Failed to remove {file_path} because: {e}")

            # make sure repository root dir exists
            if not self.repo_root.exists():
                self.repo_root.mkdir(parents=True)
                logger.info(f"Created DATS repository at {str(self.repo_root)}")

            # make sure projtemp_files_root exists
            if not self.temp_files_root.exists():
                self.temp_files_root.mkdir(parents=True)
                logger.info(
                    f"Created DATS temp files root at {str(self.temp_files_root)}"
                )

            # make sure logs dir exists
            if not self.logs_root.exists():
                self.logs_root.mkdir()
                logger.info(f"Created DATS logs root at {str(self.logs_root)}")

            # make sure projects dir exists
            if not self.proj_root.exists():
                self.proj_root.mkdir()
                logger.info(f"Created DATS project root at {str(self.proj_root)}")

        except Exception as e:
            msg = f"Cannot create repository directory structure at {conf.repo.root_directory}: {e}"
            logger.error(msg)
            raise SystemExit(msg)

    def purge_repo(self) -> None:
        logger.warning("Removing ALL FILES in repo")
        for item in self.repo_root.iterdir():
            try:
                if item.is_file() or item.is_symlink():
                    os.unlink(item)
                elif item.is_dir():
                    shutil.rmtree(item)
            except Exception as e:
                logger.error(f"Failed to remove {item} because: {e}")

    def purge_temporary_files(self) -> None:
        logger.warning("Removing temporary files in repo!")
        shutil.rmtree(self.temp_files_root)
        self.temp_files_root.mkdir(parents=True)

    def purge_project_data(self, proj_id: int) -> None:
        logger.warning(f"Removing ALL FILES in repo of project with ID={proj_id}")
        proj_repo_path = self.get_project_repo_root_path(proj_id=proj_id)
        shutil.rmtree(proj_repo_path)

    def remove_sdoc_file(self, sdoc: SourceDocumentRead) -> None:
        logger.info(
            f"Removing SourceDocument File {sdoc.filename} of project with ID={sdoc.project_id}"
        )
        self.get_path_to_sdoc_file(sdoc=sdoc, raise_if_not_exists=True).unlink()

    def remove_all_project_sdoc_files(self, proj_id: int) -> None:
        logger.info(f"Removing all SourceDocument Files of project with ID={proj_id}")
        for f in map(
            Path,
            os.scandir(self._get_project_repo_sdocs_root_path(proj_id=proj_id)),
        ):
            logger.info(
                f"Removing SourceDocument File {f.name} of project with ID={proj_id}"
            )
            f.unlink(missing_ok=False)

    def generate_sdoc_filename(
        self,
        filename: Union[str, Path],
        webp: bool = False,
        thumbnail: bool = False,
    ) -> str:
        filename = Path(self.truncate_filename(filename))
        if webp:
            if thumbnail:
                return f"{filename}.thumbnail.webp"
            else:
                return f"{filename}.webp"
        else:
            if thumbnail:
                return f"{filename.stem}.thumbnail{filename.suffix}"
            else:
                return filename.name

    def restore_sdoc_metadata_filename(self, metadata_filename: str | Path) -> str:
        """
        This method restores the name: [MY_SDOC_FILE_BASENAME]_[MY_SDOC_FILE_EXTENSION].[MY_METADATA_FILE_EXTENSION]
        to [MY_SDOC_FILE_BASENAME].[MY_METADATA_FILE_EXTENSION]
        """
        if isinstance(metadata_filename, str):
            metadata_filename = Path(metadata_filename)
        metadata_filename_split = metadata_filename.stem.split("_")
        extension = metadata_filename_split[-1]
        basename = "".join(metadata_filename_split[:-1])
        return f"{basename}.{extension}"

    def get_path_to_sdoc_file(
        self,
        sdoc: SourceDocumentRead,
        raise_if_not_exists: bool = False,
        webp: bool = False,
        thumbnail: bool = False,
    ) -> Path:
        filename = Path(self.truncate_filename(sdoc.filename))
        if (
            sdoc.doctype == DocType.image
            or sdoc.doctype == DocType.video
            or sdoc.doctype == DocType.audio
        ):
            filename = self.generate_sdoc_filename(
                filename=filename, webp=webp, thumbnail=thumbnail
            )

        dst_path = self._get_dst_path_for_project_sdoc_file(
            proj_id=sdoc.project_id, filename=filename
        )
        if raise_if_not_exists and not dst_path.exists():
            logger.error(
                (
                    f"SourceDocument {filename} with ID {sdoc.id} from Project {sdoc.project_id} cannot be"
                    f" found in Repository at {dst_path}!"
                )
            )
            raise SourceDocumentNotFoundInRepositoryError(sdoc=sdoc, dst=str(dst_path))
        return dst_path

    def get_project_repo_root_path(self, proj_id: int) -> Path:
        return self.proj_root.joinpath(f"{proj_id}/")

    def _get_project_repo_sdocs_root_path(self, proj_id: int) -> Path:
        return self.get_project_repo_root_path(proj_id=proj_id).joinpath("docs/")

    def _get_dst_path_for_project_sdoc_file(
        self, proj_id: int, filename: Union[str, Path]
    ) -> Path:
        filename = Path(self.truncate_filename(filename))
        return self._get_project_repo_sdocs_root_path(proj_id=proj_id).joinpath(
            f"{filename}"
        )

    def get_dst_path_for_temp_file(self, filename: Union[str, Path]) -> Path:
        filename = Path(self.truncate_filename(filename))
        return self.temp_files_root.joinpath(f"{filename}")

    def _project_sdoc_file_exists(
        self, proj_id: int, filename: Union[str, Path]
    ) -> bool:
        return (
            self._get_project_repo_sdocs_root_path(proj_id=proj_id)
            .joinpath(f"{filename}")
            .exists()
        )

    def _temp_file_exists(self, filename: Union[str, Path]) -> bool:
        return self.get_dst_path_for_temp_file(filename).exists()

    def create_directory_structure_for_project(self, proj_id: int) -> Optional[Path]:
        paths = [
            self.get_models_root_path(proj_id=proj_id),
            self.get_dataloaders_root_dir(proj_id=proj_id),
            self._get_project_repo_sdocs_root_path(proj_id=proj_id),
        ]
        for dst_path in paths:
            try:
                if dst_path.exists():
                    logger.warning(
                        "Cannot create project directory structure because it already exists!"
                    )
                    raise ProjectAlreadyExistsInRepositoryError(proj_id=proj_id)
                dst_path.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                # FIXME Flo: Throw or what?!
                logger.error(f"Cannot create project directory structure! {e}")

        return paths[-1]

    def _create_directory_structure_for_project_file(
        self, proj_id: int, filename: Union[str, Path]
    ) -> Path:
        filename = Path(self.truncate_filename(filename))
        dst_path = self._get_dst_path_for_project_sdoc_file(
            proj_id=proj_id, filename=filename
        )
        if dst_path.exists():
            logger.warning(
                "Cannot store uploaded file because a file with the same name already exists!"
            )
            raise FileAlreadyExistsInRepositoryError(
                proj_id=proj_id, filename=filename, dst=str(dst_path)
            )
        elif not dst_path.parent.exists():
            dst_path.parent.mkdir(parents=True, exist_ok=True)

        return dst_path

    def create_temp_file(self, fn: Optional[Union[str, Path]] = None) -> Path:
        if fn is None:
            fn = str(uuid.uuid4())

        fn = Path(self.truncate_filename(fn))
        p = self.temp_files_root / fn
        if p.exists():
            logger.warning(f"Temporary File '{fn}' already exists and is removed now!")
            p.unlink()
        Path(p).touch()
        logger.info(f"Created Temporary File at {p}")

        return p

    def write_files_to_temp_zip_file(
        self,
        files: List[Path],
        fn: Optional[str] = None,
    ) -> Path:
        if len(files) == 0:
            raise ValueError("No files to export!")

        # check that all files exist
        print(files)
        for file in files:
            if not file.exists():
                raise FileNotFoundInRepositoryError(
                    proj_id=-1, filename=file.name, dst=file
                )

        temp_file = self.create_temp_file(fn=fn)
        temp_file = temp_file.parent / (temp_file.name + ".zip")

        logger.info(f"Writing Files to {temp_file} !")
        with zipfile.ZipFile(temp_file, mode="w") as zipf:
            for file in files:
                zipf.write(file, file.name)

        return temp_file

    def write_df_to_temp_file(
        self,
        df: pd.DataFrame,
        fn: Optional[str] = None,
    ) -> Path:
        temp_file = self.create_temp_file(fn=fn)
        temp_file = temp_file.parent / (temp_file.name + ".csv")

        logger.info(f"Writing DataFrame to {temp_file} !")
        df.to_csv(temp_file, sep=",", index=False, header=True)
        return temp_file

    def write_text_to_temp_file(
        self,
        text: str,
        fn: Optional[str] = None,
    ) -> Path:
        temp_file = self.create_temp_file(fn=fn)
        temp_file = temp_file.parent / (temp_file.name + ".txt")

        logger.info(f"Writing text to {temp_file} !")
        with open(temp_file, "w") as f:
            f.write(text)
        return temp_file

    def write_json_to_temp_file(
        self,
        json_obj: Union[List[Dict[str, Any]], Dict[str, Any]],
        fn: Optional[str] = None,
    ) -> Path:
        temp_file = self.create_temp_file(fn=fn)
        temp_file = temp_file.parent / (temp_file.name + ".json")

        logger.info(f"Writing json_obj to {temp_file} !")
        with open(temp_file, "w") as f:
            json.dump(json_obj, f, indent=4)

        return temp_file

    def create_temp_dir(self, name: Optional[Union[str, Path]] = None) -> Path:
        if name is None:
            name = str(uuid.uuid4())

        name = Path(self.truncate_filename(name))
        p = self.temp_files_root / name
        if p.exists():
            logger.warning(
                f"Temporary Directory '{name}' already exists and is removed now!"
            )
            shutil.rmtree(str(p))
        Path(p).mkdir(parents=True)
        logger.info(f"Created Temporary Directory at {p}")

        return p

    def get_temp_file_url(self, fn: Union[str, Path], relative: bool = True) -> str:
        fn = Path(self.truncate_filename(fn))
        p = self.temp_files_root / fn
        if not p.exists():
            raise FileNotFoundInRepositoryError(proj_id=-1, filename=fn, dst=p)

        relative_url = str(p.relative_to(self.repo_root))
        if relative:
            return relative_url

        return url.urljoin(self.base_url, relative_url)

    def get_sdoc_url(
        self,
        sdoc: SourceDocumentRead,
        relative: bool = True,
        webp: bool = False,
        thumbnail: bool = False,
    ) -> str:
        dst_path = self.get_path_to_sdoc_file(
            sdoc, raise_if_not_exists=True, webp=webp, thumbnail=thumbnail
        )
        relative_url = str(dst_path.relative_to(self.repo_root))
        if relative:
            return relative_url
        return url.urljoin(self.base_url, relative_url)

    def get_url_from_file_in_repo(
        self,
        file_path: Path,
        relative: bool = True,
        webp: bool = False,
        thumbnail: bool = False,
    ) -> str:
        if not file_path.exists():
            msg = f"File {file_path} not found in Repository!"
            logger.error(msg)
            raise FileNotFoundError(msg)

        relative_url = str(file_path.relative_to(self.repo_root))
        if relative:
            return relative_url
        return url.urljoin(self.base_url, relative_url)

    def extract_archive_in_project(
        self, proj_id: int, archive_path: Path
    ) -> List[Path]:
        archive_path_in_project = self._get_dst_path_for_project_sdoc_file(
            proj_id=proj_id, filename=archive_path.name
        )
        dst = archive_path_in_project.parent

        logger.info(f"Extracting archive at {archive_path_in_project} ...")
        if not zipfile.is_zipfile(archive_path_in_project):
            raise ErroneousArchiveException(
                archive_path=archive_path_in_project,
                msg="Not a valid zip file!",
            )
        logger.info(f"Extracting archive {archive_path_in_project.name} to {dst} ...")
        # taken from: https://stackoverflow.com/a/4917469
        # flattens the extracted file hierarchy
        try:
            extracted_file_paths = []
            with ZipFile(archive_path_in_project, "r") as zip_archive:
                files_in_archive = zip_archive.namelist()
                logger.debug(
                    f"Archive {archive_path_in_project.name} contains {len(files_in_archive)} files..."
                )
                for member in files_in_archive:
                    filename = os.path.basename(member)
                    # skip directories
                    if not filename:
                        # TODO Flo: what to do with nested subdirectories
                        continue

                    # copy file (taken from zipfile's extract)
                    source = zip_archive.open(member)
                    target_p = os.path.join(dst, filename)
                    target = open(target_p, "wb")
                    with source, target:
                        shutil.copyfileobj(source, target)
                    extracted_file_paths.append(Path(target_p))
        except Exception as e:
            logger.error(
                f"Cannot extract Archive {archive_path_in_project.name}! Error: {e}"
            )
            raise ErroneousArchiveException(archive_path=archive_path_in_project)

        logger.info(f"Extracting archive at {archive_path_in_project}... Done!")
        return extracted_file_paths

    def move_file_to_project_sdoc_files(self, proj_id: int, src_file: Path) -> Path:
        if not (src_file.exists() and src_file.is_file()):
            raise ValueError(f"File {src_file} does not exist!")

        fn = Path(self.truncate_filename(src_file.name))
        in_project_dst = self._create_directory_structure_for_project_file(
            proj_id=proj_id, filename=fn
        )

        # move the file
        src_file.rename(in_project_dst)
        return in_project_dst

    def store_uploaded_file(
        self, uploaded_file: UploadFile, filepath: Path, fn: Path | str
    ) -> Path:
        real_file_size = 0
        with open(filepath, "wb") as f:
            for chunk in uploaded_file.file:
                real_file_size += len(chunk)
                if real_file_size > conf.api.max_upload_file_size:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"File {fn} is too large!"
                            f" Maximum allowed size in bytes: {conf.api.max_upload_file_size}"
                        ),
                    )
                f.write(chunk)
            f.close()
        return filepath

    def store_uploaded_file_in_project_repo(
        self, proj_id: int, uploaded_file: UploadFile
    ) -> Path:
        try:
            if uploaded_file.filename is None:
                raise HTTPException(
                    status_code=BAD_REQUEST, detail="Uploaded file has no filename!"
                )

            fn = Path(self.truncate_filename(uploaded_file.filename))
            in_project_dst = self._create_directory_structure_for_project_file(
                proj_id=proj_id, filename=fn
            )
            logger.info(
                f"Storing Uploaded File {fn} in Project {proj_id} Repo at {in_project_dst.relative_to(self.repo_root)} ..."
            )
            self.store_uploaded_file(
                uploaded_file=uploaded_file, filepath=in_project_dst, fn=fn
            )

            return in_project_dst
        except HTTPException as e:
            raise e
        except Exception as e:
            # FIXME Flo: Throw or what?!
            logger.warning(f"Cannot store uploaded file! Error:\n  {e}")
            raise e

    def build_source_document_create_dto_from_file(
        self, proj_id: int, filename: Union[str, Path], **extra_data
    ) -> Tuple[Path, SourceDocumentCreate]:
        filename = self.truncate_filename(filename)
        dst_path = self._get_dst_path_for_project_sdoc_file(
            proj_id=proj_id, filename=filename
        )
        if not dst_path.exists():
            logger.error(
                f"File '{filename}' in Project {proj_id} cannot be found in Repository at {dst_path}!"
            )
            raise FileNotFoundInRepositoryError(
                proj_id=proj_id, filename=filename, dst=str(dst_path)
            )

        mime_type = magic.from_file(dst_path, mime=True)
        doctype = get_doc_type(mime_type=mime_type)
        if not doctype:
            logger.error(
                f"Unsupported DocType (for MIME Type {mime_type})!"
                " Cannot create SourceDocument from file {dst_path}"
            )
            raise UnsupportedDocTypeForSourceDocument(dst_path=dst_path)

        create_dto = SourceDocumentCreate(
            filename=filename,
            doctype=doctype,
            project_id=proj_id,
            status=SDocStatus.unfinished_or_erroneous,
            **extra_data,
        )
        return dst_path, create_dto

    def get_models_root_path(self, proj_id: int) -> Path:
        return self.get_project_repo_root_path(proj_id=proj_id).joinpath("models")

    def get_model_dir(
        self,
        proj_id: int,
        model_name: str,
        model_prefix: str = "cota_",
    ) -> Path:
        name = (
            self.get_models_root_path(proj_id=proj_id) / f"{model_prefix}{model_name}"
        )
        return name

    def model_exists(
        self,
        proj_id: int,
        model_name: str,
        model_prefix: str = "cota_",
    ) -> bool:
        return self.get_model_dir(proj_id=proj_id, model_name=model_name).exists()

    def get_dataloaders_root_dir(self, proj_id: int) -> Path:
        return self.get_project_repo_root_path(proj_id=proj_id).joinpath("dataloaders")

    def get_dataloader_filename(
        self,
        proj_id: int,
        dataloader_name: str,
        dataloader_prefix: str = "cota_",
    ) -> Path:
        return self.get_dataloaders_root_dir(proj_id=proj_id).joinpath(dataloader_name)

    def dataloader_exists(
        self,
        proj_id: int,
        dataloader_name: str,
        dataloader_prefix: str = "cota_",
    ) -> bool:
        return self.get_dataloader_filename(
            proj_id=proj_id, dataloader_name=dataloader_name
        ).exists()
