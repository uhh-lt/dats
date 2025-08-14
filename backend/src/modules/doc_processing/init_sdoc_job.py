from pathlib import Path

from common.doc_type import DocType
from common.job_type import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from loguru import logger
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job, JobInputBase, JobOutputBase
from systems.job_system.job_register_decorator import register_job

fsr: FilesystemRepo = FilesystemRepo()


class SdocInitJobInput(JobInputBase):
    filepath: Path
    doctype: DocType
    folder_id: int | None


class SdocInitJobOutput(JobOutputBase):
    sdoc_id: int
    folder_id: int


@register_job(
    job_type=JobType.SDOC_INIT,
    input_type=SdocInitJobInput,
    output_type=SdocInitJobOutput,
)
def handle_init_sdoc_job(payload: SdocInitJobInput, job: Job) -> SdocInitJobOutput:
    with SQLRepo().db_session() as db:
        # create sdoc (& optionally the corresponding folder)
        logger.info(f"Persisting SourceDocument for {payload.filepath.name}...")
        create_dto = SourceDocumentCreate(
            filename=payload.filepath.name,
            doctype=payload.doctype,
            project_id=payload.project_id,
            # TODO status
            # status=SDocStatus.unfinished_or_erroneous,
            folder_id=payload.folder_id,
        )
        sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

        return SdocInitJobOutput(
            sdoc_id=sdoc_db_obj.id, folder_id=sdoc_db_obj.folder_id
        )
