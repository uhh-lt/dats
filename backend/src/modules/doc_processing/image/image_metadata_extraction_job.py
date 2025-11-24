from pathlib import Path

from PIL import Image

from common.doc_type import DocType
from common.job_type import JobType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

fsr = FilesystemRepo()
sqlr = SQLRepo()


class ImageMetadataExtractionJobInput(SdocProcessingJobInput):
    filepath: Path


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> ImageMetadataExtractionJobInput:
    with sqlr.db_session() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        assert sdoc.doctype == DocType.image, (
            f"SourceDocument with {payload.sdoc_id=} is not an image!"
        )

    image_path = fsr.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)

    return ImageMetadataExtractionJobInput(
        **payload.model_dump(),
        filepath=image_path,
    )


@register_job(
    job_type=JobType.IMAGE_METADATA_EXTRACTION,
    input_type=ImageMetadataExtractionJobInput,
    enricher=enrich_for_recompute,
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
        crud_sdoc_meta.update_multi_with_doctype(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=DocType.image,
            keys=["width", "height", "format", "mode"],
            values=[width, height, format, mode],
        )
