from pathlib import Path

from common.doc_type import DocType
from common.job_type import JobType
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from PIL import Image
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job, SdocJobInput
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


class ImageMetadataExtractionJobInput(SdocJobInput):
    filepath: Path
    doctype: DocType


@register_job(
    job_type=JobType.IMAGE_METADATA_EXTRACTION,
    input_type=ImageMetadataExtractionJobInput,
)
def handle_image_metadata_extraction_job(
    payload: ImageMetadataExtractionJobInput, job: Job
) -> None:
    with Image.open(payload.filepath) as img:
        width = img.width
        height = img.height
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
