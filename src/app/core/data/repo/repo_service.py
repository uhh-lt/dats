import os
import shutil
import urllib.parse as url
from pathlib import Path
from typing import Tuple, Optional

from fastapi import UploadFile
from loguru import logger

from app.core.data.doc_type import get_doc_type, DocType
from app.core.data.dto.source_document import SourceDocumentCreate, SourceDocumentRead
from app.util.singleton_meta import SingletonMeta
from config import conf


# TODO Flo: Currently only supports localhost but in future it could be that processes running on a different host use
#           this service...

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

    def get_path_to_file(self, sdoc: SourceDocumentRead) -> Path:
        return self.proj_root.joinpath(f"{sdoc.project_id}/docs/{sdoc.filename}")

    def get_sdoc_url(self, sdoc: SourceDocumentRead) -> Optional[str]:
        dst_path = RepoService().get_path_to_file(sdoc)
        if not dst_path.exists():
            logger.error((f"SourceDocument {sdoc.filename} with ID {sdoc.id} from Project {sdoc.project_id} cannot be"
                          f" found in Repository at {dst_path}!"))
            return None
        return url.urljoin(self.base_url,
                           str(dst_path.relative_to(self.repo_root)))

    def store_uploaded_document(self,
                                doc_file: UploadFile,
                                project_id: int) -> Tuple[Path, SourceDocumentCreate]:
        # save the file to disk
        dst = self.proj_root.joinpath(f"{project_id}/docs/{doc_file.filename}")
        try:
            if dst.exists():
                # FIXME Flo: Throw or what?!
                logger.warning("Cannot store uploaded document because a document with the same name already exists!")
            elif not dst.parent.exists():
                dst.parent.mkdir(parents=True, exist_ok=True)

            with dst.open("wb") as buffer:
                shutil.copyfileobj(doc_file.file, buffer)
                logger.debug(f"Stored uploaded document at {str(dst)}")
                doc_file.file.seek(0, 0)
                # FIXME Flo: Change SourceDocument to work with images! --> no raw_text
                if get_doc_type(mime_type=doc_file.content_type) == DocType.image:
                    txt_content = "IMAGES CONTAIN NO UTF-8 TEXT!"
                else:
                    txt_content = doc_file.file.read().decode("utf-8")

                create_dto = SourceDocumentCreate(content=txt_content,
                                                  filename=doc_file.filename,
                                                  doctype=get_doc_type(mime_type=doc_file.content_type),
                                                  project_id=project_id)
        except Exception as e:
            # FIXME Flo: Throw or what?!
            logger.warning(f"Cannot store uploaded document! Cause: {e}")
        finally:
            doc_file.file.close()

        return dst, create_dto
