from pathlib import Path

from common.doc_type import DocType
from common.job_type import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from PIL import Image
from pydantic import BaseModel
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobPriority,
)
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


class ImageSdocJobInput(JobInputBase):
    filepath: Path
    folder_id: int | None


class ImageSdocJobOutput(BaseModel):
    sdoc_id: int


@register_job(
    job_type=JobType.IMAGE_METADATA_EXTRACTION,
    input_type=ImageSdocJobInput,
    output_type=ImageSdocJobOutput,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def handle_image_metadata_extraction_job(
    payload: ImageSdocJobInput, job: Job
) -> ImageSdocJobOutput:
    with sqlr.db_session() as db:
        # Store image metadata in db
        sdoc = crud_sdoc.create(
            db,
            create_dto=SourceDocumentCreate(
                filename=payload.filepath.name,
                name=payload.filepath.name,
                doctype=DocType.image,
                status=SDocStatus.unfinished_or_erroneous,
                project_id=payload.project_id,
                folder_id=payload.folder_id,
            ),
        )
    return ImageSdocJobOutput(sdoc_id=sdoc.id)
