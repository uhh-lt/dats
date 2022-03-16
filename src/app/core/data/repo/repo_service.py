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
        try:
            # make sure repository root dir exists
            repo_root = Path(conf.repository_root)
            if not repo_root.exists():
                repo_root.mkdir(parents=True)
                logger.info(f"Created DWTS repository at {str(repo_root)}")
            cls.repo_root = repo_root

            # make sure logs dir exists
            logs_root = repo_root.joinpath("logs")
            if not logs_root.exists():
                logs_root.mkdir()
            cls.logs_root = logs_root

            # make sure projects dir exists
            proj_root = repo_root.joinpath("projects")
            if not proj_root.exists():
                proj_root.mkdir()
            cls.proj_root = proj_root

            return super(RepoService, cls).__new__(cls)

        except Exception as e:
            msg = f"Cannot setup repository at {conf.repository_root}"
            logger.error(msg)
            raise SystemExit(msg)

    def store_uploaded_document(self,
                                doc_file: UploadFile,
                                project_id: int) -> Tuple[Path, SourceDocumentCreate]:
        # save the file to disk
        dst = self.proj_root.joinpath(f"projects/{project_id}/docs/{doc_file.filename}")
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
