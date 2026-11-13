from pathlib import Path

from common.doc_type_enum import DocType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from core.doc.source_document_dto import SourceDocumentRead
from modules.doc_processing.artefacts import THUMBNAIL
from modules.doc_processing.image.image_thumbnail_utils import generate_thumbnails
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

fsr = FilesystemRepo()
sqlr = SQLRepo()


class ImageThumbnailJobInput(SdocProcessingJobInput):
    filepath: Path


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> ImageThumbnailJobInput:
    with sqlr.transaction() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        assert sdoc.doctype == DocType.image, (
            f"SourceDocument with {payload.sdoc_id=} is not an image!"
        )

    image_path = fsr.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)

    return ImageThumbnailJobInput(
        **payload.model_dump(),
        filepath=image_path,
    )


@pipeline_step(
    requires=set(),
    produces={THUMBNAIL},
    doctypes={DocType.image},
)
@register_job(
    job_type="image_thumbnail",
    input_type=ImageThumbnailJobInput,
    enricher=enrich_for_recompute,
)
def handle_image_thumbnail_job(payload: ImageThumbnailJobInput, job: Job) -> None:
    generate_thumbnails(payload.filepath)

    # Store link to webp image in DB
    with sqlr.transaction() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        repo_url = FilesystemRepo().get_sdoc_url(
            sdoc=sdoc,
            relative=True,
            webp=True,
            thumbnail=False,
        )
        crud_sdoc_data.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentDataUpdate(repo_url=repo_url),
        )
