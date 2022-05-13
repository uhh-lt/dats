import os
import shutil
import urllib.parse as url
import zipfile
from pathlib import Path
from typing import Tuple, Optional
from zipfile import ZipFile

import magic
from fastapi import UploadFile
from loguru import logger

from app.core.data.doc_type import get_doc_type
from app.core.data.dto.source_document import SourceDocumentCreate, SourceDocumentRead
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


class UnsupportedDocTypeForSourceDocument(Exception):
    def __init__(self, dst_path: Path):
        super().__init__(f"Unsupported DocType! Cannot create SourceDocument from file {dst_path}.")


class RepoService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        repo_root = Path(conf.repo.root_directory)
        cls.repo_root = repo_root
        cls.logs_root = repo_root.joinpath("logs")
        cls.proj_root = repo_root.joinpath("projects")

        # setup base url where the content server can be reached
        base_url = "https://" if conf.repo.content_server.https else "http://"
        base_url += conf.repo.content_server.host + ":"
        base_url += str(conf.repo.content_server.port)
        base_url += conf.repo.content_server.context_path
        cls.base_url = base_url

        return super(RepoService, cls).__new__(cls)

    def _create_directory_structure(self, remove_if_exists: bool = False):
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

            # make sure logs dir exists
            if not self.logs_root.exists():
                self.logs_root.mkdir()

            # make sure projects dir exists
            if not self.proj_root.exists():
                self.proj_root.mkdir()

        except Exception as e:
            msg = f"Cannot create repository directory structure at {conf.repo.root_directory}"
            logger.error(msg)
            raise SystemExit(msg)

    def get_path_to_file(self, sdoc: SourceDocumentRead, raise_if_not_exists: bool = False) -> Path:
        dst_path = self._generate_dst_path(proj_id=sdoc.project_id, filename=sdoc.filename)
        if raise_if_not_exists and not dst_path.exists():
            logger.error(
                (f"SourceDocument {sdoc.filename} with ID {sdoc.id} from Project {sdoc.project_id} cannot be"
                 f" found in Repository at {dst_path}!"))
            raise SourceDocumentNotFoundInRepositoryError(sdoc=sdoc, dst=str(dst_path))
        return dst_path

    def _generate_dst_path(self, proj_id: int, filename: str) -> Path:
        return self.proj_root.joinpath(f"{proj_id}/docs/{filename}")

    def get_sdoc_url(self, sdoc: SourceDocumentRead) -> Optional[str]:
        dst_path = RepoService().get_path_to_file(sdoc, raise_if_not_exists=True)
        return url.urljoin(self.base_url, str(dst_path.relative_to(self.repo_root)))

    def store_uploaded_file(self, proj_id: int, uploaded_file: UploadFile) -> Path:
        dst = self._generate_dst_path(proj_id=proj_id, filename=uploaded_file.filename)
        try:
            if dst.exists():
                logger.warning("Cannot store uploaded file because a file with the same name already exists!")
                raise FileAlreadyExistsInRepositoryError(proj_id=proj_id, filename=uploaded_file.filename, dst=str(dst))
            elif not dst.parent.exists():
                dst.parent.mkdir(parents=True, exist_ok=True)

            with dst.open("wb") as buffer:
                shutil.copyfileobj(uploaded_file.file, buffer)
                logger.debug(f"Stored uploaded file at {str(dst)}")
        except Exception as e:
            # FIXME Flo: Throw or what?!
            logger.warning(f"Cannot store uploaded file! Error: {e}")
        finally:
            uploaded_file.file.close()

        return dst

    def generate_source_document_create_dto_from_file(self, proj_id: int, filename: str) -> Tuple[Path,
                                                                                                  SourceDocumentCreate]:
        dst_path = self._generate_dst_path(proj_id=proj_id, filename=filename)
        if not dst_path.exists():
            logger.error(f"File '{filename}' in Project {proj_id} cannot be found in Repository at {dst_path}!")
            raise FileNotFoundInRepositoryError(proj_id=proj_id, filename=filename, dst=str(dst_path))

        doctype = get_doc_type(mime_type=magic.from_file(dst_path, mime=True))
        if not doctype:
            logger.error(f"Unsupported DocType! Cannot create SourceDocument from file {dst_path}.")
            raise UnsupportedDocTypeForSourceDocument(dst_path=dst_path)

        create_dto = SourceDocumentCreate(content="CONTENT IS NOW IN ElasticSearch!!!",
                                          filename=filename,
                                          doctype=doctype,
                                          project_id=proj_id)
        return dst_path, create_dto
