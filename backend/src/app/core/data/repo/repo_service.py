import os
import shutil
import urllib.parse as url
import zipfile
from pathlib import Path
from typing import Tuple, Optional, List
from zipfile import ZipFile

import magic
from fastapi import UploadFile, HTTPException
from loguru import logger

from app.core.data.doc_type import get_doc_type, DocType
from app.core.data.dto.source_document import SourceDocumentCreate, SourceDocumentRead, SDocStatus
from app.util.singleton_meta import SingletonMeta
from config import conf


# TODO Flo: Currently only supports localhost but in future it could be that processes running on a different host use
#           this service...


class SourceDocumentNotFoundInRepositoryError(Exception):
    def __init__(self, sdoc: SourceDocumentRead, dst: str):
        super().__init__((f"The original file of SourceDocument {sdoc.id} ({sdoc.filename}) cannot be found in "
                          f"the DWTS Repository at {dst}"))


class FileNotFoundInRepositoryError(Exception):
    def __init__(self, proj_id: int, filename: str, dst: str):
        super().__init__(f"The file '{filename}' of Project {proj_id} cannot be found in the DWTS Repository at {dst}")


class FileAlreadyExistsInRepositoryError(Exception):
    def __init__(self, proj_id: int, filename: str, dst: str):
        super().__init__(f"Cannot store the file '{filename}' of Project {proj_id} because there is a file with the "
                         f"same name in the DWTS Repository at {dst}")


class ProjectAlreadyExistsInRepositoryError(Exception):
    def __init__(self, proj_id: int):
        super().__init__(f"Cannot create directory structure for Project {proj_id} because it already exists!")


class UnsupportedDocTypeForSourceDocument(Exception):
    def __init__(self, dst_path: Path):
        super().__init__(f"Unsupported DocType! Cannot create SourceDocument from file {dst_path}.")


class ErroneousArchiveException(Exception):
    def __init__(self, archive_path: Path):
        super().__init__(f"Error with Archive {archive_path}.")


class RepoService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        repo_root = Path(conf.repo.root_directory)
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

    def _create_root_repo_directory_structure(self, remove_if_exists: bool = False):
        try:
            if self.repo_root.exists() and remove_if_exists:
                logger.warning(f"Removing DWTS Repo at {self.repo_root}")
                for filename in self.repo_root.iterdir():
                    file_path = self.repo_root.joinpath(self.repo_root, filename)
                    try:
                        if file_path.is_file() or file_path.is_symlink():
                            os.unlink(file_path)
                        elif file_path.is_dir():
                            shutil.rmtree(file_path)
                    except Exception as e:
                        print(f"Failed to remove {file_path} because: {e}")

            # make sure repository root dir exists
            if not self.repo_root.exists():
                self.repo_root.mkdir(parents=True)
                logger.info(f"Created DWTS repository at {str(self.repo_root)}")

            # make sure projtemp_files_root exists
            if not self.temp_files_root.exists():
                self.temp_files_root.mkdir(parents=True)
                logger.info(f"Created DWTS temp files root at {str(self.temp_files_root)}")

            # make sure logs dir exists
            if not self.logs_root.exists():
                self.logs_root.mkdir()
                logger.info(f"Created DWTS logs root at {str(self.logs_root)}")

            # make sure projects dir exists
            if not self.proj_root.exists():
                self.proj_root.mkdir()
                logger.info(f"Created DWTS project root at {str(self.proj_root)}")

        except Exception as e:
            msg = f"Cannot create repository directory structure at {conf.repo.root_directory}"
            logger.error(msg)
            raise SystemExit(msg)

    def purge_project_data(self, proj_id: int) -> None:
        logger.warning(f"Removing ALL FILES in repo of project with ID={proj_id}")
        proj_repo_path = self.get_project_repo_root_path(proj_id=proj_id)
        shutil.rmtree(proj_repo_path)

    def remove_sdoc_file(self, sdoc: SourceDocumentRead) -> None:
        logger.info(f"Removing SourceDocument File {sdoc.filename} of project with ID={sdoc.project_id}")
        self.get_path_to_sdoc_file(sdoc=sdoc, raise_if_not_exists=True).unlink()

    def remove_all_project_sdoc_files(self, proj_id: int) -> None:
        logger.info(f"Removing all SourceDocument Files of project with ID={proj_id}")
        for f in map(Path, os.scandir(self._get_project_repo_sdocs_root_path(proj_id=proj_id))):
            logger.info(f"Removing SourceDocument File {f.name} of project with ID={proj_id}")
            f.unlink(missing_ok=False)

    def generate_sdoc_filename(self, filename: str, webp: bool = False, thumbnail: bool = False) -> str:
        filename = Path(filename)
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

    def get_path_to_sdoc_file(self, sdoc: SourceDocumentRead, raise_if_not_exists: bool = False, webp: bool = False,
                              thumbnail: bool = False) -> Path:
        filename = sdoc.filename
        if sdoc.doctype == DocType.image:
            filename = self.generate_sdoc_filename(filename=filename, webp=webp, thumbnail=thumbnail)

        dst_path = self._get_dst_path_for_project_file(proj_id=sdoc.project_id, filename=filename)
        if raise_if_not_exists and not dst_path.exists():
            logger.error(
                (f"SourceDocument {filename} with ID {sdoc.id} from Project {sdoc.project_id} cannot be"
                 f" found in Repository at {dst_path}!"))
            raise SourceDocumentNotFoundInRepositoryError(sdoc=sdoc, dst=str(dst_path))
        return dst_path

    def get_project_repo_root_path(self, proj_id: int) -> Path:
        return self.proj_root.joinpath(f"{proj_id}/")

    def _get_project_repo_sdocs_root_path(self, proj_id: int) -> Path:
        return self.get_project_repo_root_path(proj_id=proj_id).joinpath("docs/")

    def _get_dst_path_for_project_file(self, proj_id: int, filename: str) -> Path:
        return self._get_project_repo_sdocs_root_path(proj_id=proj_id).joinpath(f"{filename}")

    def create_directory_structure_for_project(self, proj_id: int) -> Optional[Path]:
        dst_path = self._get_project_repo_sdocs_root_path(proj_id=proj_id)
        try:
            if dst_path.exists():
                logger.warning("Cannot create project directory structure because it already exists!")
                raise ProjectAlreadyExistsInRepositoryError(proj_id=proj_id)
            dst_path.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            # FIXME Flo: Throw or what?!
            logger.error(f"Cannot create project directory structure! {e}")

        return dst_path

    def _create_directory_structure_for_project_file(self, proj_id: int, filename: str) -> Optional[Path]:
        dst_path = self._get_dst_path_for_project_file(proj_id=proj_id, filename=filename)
        try:
            if dst_path.exists():
                logger.warning("Cannot store uploaded file because a file with the same name already exists!")
                raise FileAlreadyExistsInRepositoryError(proj_id=proj_id, filename=filename, dst=str(dst_path))
            elif not dst_path.parent.exists():
                dst_path.parent.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            # FIXME Flo: Throw or what?!
            logger.warning(f"Cannot store uploaded file! Error: {e}")

        return dst_path

    def get_sdoc_url(self, sdoc: SourceDocumentRead, relative: bool = True, webp: bool = False,
                     thumbnail: bool = False) -> Optional[str]:
        dst_path = self.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True, webp=webp, thumbnail=thumbnail)
        relative_url = str(dst_path.relative_to(self.repo_root))
        if relative:
            return relative_url
        return url.urljoin(self.base_url, relative_url)

    def extract_archive_in_project(self, proj_id: int, archive_path: Path) \
            -> List[Path]:
        archive_path_in_project = self._get_dst_path_for_project_file(proj_id=proj_id,
                                                                      filename=archive_path.name)
        dst = archive_path_in_project.parent

        logger.debug(f"Extracting archive at {archive_path_in_project} ...")
        if not zipfile.is_zipfile(archive_path_in_project):
            raise ErroneousArchiveException(archive_path=archive_path_in_project)
        logger.debug(f"Extracting archive {archive_path_in_project.name} to {dst} ...")
        # taken from: https://stackoverflow.com/a/4917469
        # flattens the extracted file hierarchy
        try:
            with ZipFile(archive_path_in_project, "r") as zip_archive:
                extracted_files = zip_archive.namelist()
                logger.debug(f"Archive {archive_path_in_project.name} contains {len(extracted_files)} files...")
                for member in extracted_files:
                    filename = os.path.basename(member)
                    # skip directories
                    if not filename:
                        # TODO Flo: what to do with nested subdirectories
                        continue

                    # copy file (taken from zipfile's extract)
                    source = zip_archive.open(member)
                    target = open(os.path.join(dst, filename), "wb")
                    with source, target:
                        shutil.copyfileobj(source, target)
        except Exception as e:
            logger.error(f"Cannot extract Archive {archive_path_in_project.name}! Error: {e}")
            raise ErroneousArchiveException(archive_path=archive_path_in_project)

        logger.debug(f"Extracting archive at {archive_path_in_project}... Done!")
        return [dst.joinpath(file) for file in extracted_files]

    def store_uploaded_file_in_project_repo(self, proj_id: int, uploaded_file: UploadFile) -> Path:
        try:
            in_project_dst = self._create_directory_structure_for_project_file(proj_id=proj_id,
                                                                               filename=uploaded_file.filename)
            logger.info(f"Storing Uploaded File {uploaded_file.filename} in Project {proj_id} Repo at {in_project_dst}")
            real_file_size = 0
            with open(in_project_dst, "wb") as f:
                for chunk in uploaded_file.file:
                    real_file_size += len(chunk)
                    if real_file_size > conf.api.max_upload_file_size:
                        raise HTTPException(status_code=413,
                                            detail=(f"File {uploaded_file.filename} is too large!"
                                                    f" Maximum allowed size in bytes: {conf.api.max_upload_file_size}"))
                    f.write(chunk)
                f.close()

            return in_project_dst
        except HTTPException as e:
            raise e
        except Exception as e:
            # FIXME Flo: Throw or what?!
            logger.warning(f"Cannot store uploaded file! Error:\n  {e}")

    def build_source_document_create_dto_from_file(self, proj_id: int, filename: str) -> Tuple[Path,
                                                                                               SourceDocumentCreate]:
        dst_path = self._get_dst_path_for_project_file(proj_id=proj_id, filename=filename)
        if not dst_path.exists():
            logger.error(f"File '{filename}' in Project {proj_id} cannot be found in Repository at {dst_path}!")
            raise FileNotFoundInRepositoryError(proj_id=proj_id, filename=filename, dst=str(dst_path))

        mime_type = magic.from_file(dst_path, mime=True)
        doctype = get_doc_type(mime_type=mime_type)
        if not doctype:
            logger.error(f"Unsupported DocType (for MIME Type {mime_type})!"
                         " Cannot create SourceDocument from file {dst_path}")
            raise UnsupportedDocTypeForSourceDocument(dst_path=dst_path)

        create_dto = SourceDocumentCreate(content="CONTENT IS NOW IN ElasticSearch!!!",
                                          filename=filename,
                                          doctype=doctype,
                                          project_id=proj_id,
                                          status=SDocStatus.undefined_or_erroneous)
        return dst_path, create_dto