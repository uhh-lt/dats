from pathlib import Path

from common.doc_type import DocType
from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from PIL import Image
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobPriority,
)
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


class ImageMetadataExtractionJobInput(JobInputBase):
    sdoc_id: int
    filepath: Path
    doctype: DocType


@register_job(
    job_type="image_metadata_extraction",
    input_type=ImageMetadataExtractionJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def handle_image_metadata_extraction_job(
    payload: ImageMetadataExtractionJobInput, job: Job
) -> None:
    with Image.open(payload.filepath) as img:
        width = str(img.width)
        height = str(img.height)
        format = str(img.format)
        mode = str(img.mode)

    with sqlr.db_session() as db:
        # Store image metadata in db
        crud_sdoc_meta.create_multi_with_doctype(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=DocType.image,
            keys=["width", "height", "format", "mode"],
            values=[width, height, format, mode],
        )

        # Set db status
        crud_sdoc_status.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentStatusUpdate(image_metadata=True),
        )
