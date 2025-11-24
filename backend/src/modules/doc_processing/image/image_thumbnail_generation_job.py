from pathlib import Path

from PIL import Image

from common.doc_type import DocType
from common.job_type import JobType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from core.doc.source_document_dto import SourceDocumentRead
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

fsr = FilesystemRepo()
sqlr = SQLRepo()


class ImageThumbnailJobInput(SdocProcessingJobInput):
    filepath: Path


def generate_thumbnails(image_path: Path):
    with Image.open(image_path) as im:
        web_p_fn = fsr.generate_sdoc_filename(image_path, webp=True, thumbnail=False)
        # convert to webp
        im.save(
            web_p_fn,
            "WEBP",
            quality=50,
            lossless=True,
            method=6,
        )
        # create thumbnail
        thumbnail_fn = fsr.generate_sdoc_filename(image_path, webp=True, thumbnail=True)
        im.thumbnail((256, 256))
        im.save(
            thumbnail_fn,
            "WEBP",
            quality=50,
            lossless=True,
            method=6,
        )


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> ImageThumbnailJobInput:
    with sqlr.db_session() as db:
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


@register_job(
    job_type=JobType.IMAGE_THUMBNAIL,
    input_type=ImageThumbnailJobInput,
    enricher=enrich_for_recompute,
)
def handle_image_thumbnail_job(payload: ImageThumbnailJobInput, job: Job) -> None:
    generate_thumbnails(payload.filepath)

    # Store link to webp image in DB
    with sqlr.db_session() as db:
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
