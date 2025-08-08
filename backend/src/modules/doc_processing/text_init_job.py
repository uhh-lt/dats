from pathlib import Path

from common.doc_type import DocType
from common.job_type import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusCreate
from loguru import logger
from pydantic import BaseModel
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job, JobInputBase
from systems.job_system.job_register_decorator import register_job

fsr: FilesystemRepo = FilesystemRepo()


class TextInitJobInput(JobInputBase):
    filepath: Path


class TextInitJobOutput(BaseModel):
    sdoc_id: int


@register_job(
    job_type=JobType.TEXT_INIT,
    input_type=TextInitJobInput,
    output_type=TextInitJobOutput,
)
def handle_init_text_job(payload: TextInitJobInput, job: Job) -> TextInitJobOutput:
    with SQLRepo().db_session() as db:
        # split document

        # create folder (if we split the document)

        # create sdoc
        logger.info(f"Persisting SourceDocument for {payload.filepath.name}...")
        create_dto = SourceDocumentCreate(
            filename=payload.filepath.name,
            doctype=DocType.text,
            project_id=payload.project_id,
            status=SDocStatus.unfinished_or_erroneous,
            folder_id=None,
        )
        sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

        # create sdoc status
        crud_sdoc_status.create(
            db=db,
            create_dto=SourceDocumentStatusCreate(id=sdoc_db_obj.id),
        )

        return TextInitJobOutput(sdoc_id=sdoc_db_obj.id)
