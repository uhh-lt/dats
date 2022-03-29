import shutil
from pathlib import Path
from typing import Tuple

from fastapi import UploadFile
from loguru import logger

from app.core.data.dto.source_document import SourceDocumentCreate, DocTypeDict
from app.util.singleton_meta import SingletonMeta
from config import conf


# TODO Flo: Currently only supports localhost but in future it could be that processes running on a different host use
#           this service...

class RepoService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        repo_root = Path(conf.repository_root)
        cls.repo_root = repo_root
        cls.logs_root = repo_root.joinpath("logs")
        cls.proj_root = repo_root.joinpath("projects")

        return super(RepoService, cls).__new__(cls)

    def _create_directory_structure(self):
        try:
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
            msg = f"Cannot create repository directory structure at {conf.repository_root}"
            logger.error(msg)
            raise SystemExit(msg)

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
                dst.parent.mkdir(parents=True)

            with dst.open("wb") as buffer:
                shutil.copyfileobj(doc_file.file, buffer)
                logger.debug(f"Stored uploaded document at {str(dst)}")
                doc_file.file.seek(0, 0)
                txt_content = doc_file.file.read().decode("utf-8")
                create_dto = SourceDocumentCreate(content=txt_content,
                                                  filename=doc_file.filename,
                                                  doctype=DocTypeDict[doc_file.content_type],
                                                  project_id=project_id)
        except Exception as e:
            # FIXME Flo: Throw or what?!
            logger.warning(f"Cannot store uploaded document! Cause: {e}")
        finally:
            doc_file.file.close()

        return dst, create_dto
