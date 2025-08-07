from pathlib import Path

from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from PIL import Image
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobPriority,
)
from systems.job_system.job_register_decorator import register_job

fsr: FilesystemRepo = FilesystemRepo()
sqlr = SQLRepo()


class ImageThumbnailJobInput(JobInputBase):
    filepath: Path
    sdoc_id: int


@register_job(
    job_type="image_thumbnail",
    input_type=ImageThumbnailJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def handle_image_thumbnail_job(payload: ImageThumbnailJobInput, job: Job) -> None:
    # TODO: mit metadata extraction zusammen machen? beide benutzen PIL ...

    with Image.open(payload.filepath) as im:
        web_p_fn = fsr.generate_sdoc_filename(
            payload.filepath, webp=True, thumbnail=False
        )
        # convert to webp
        im.save(
            web_p_fn,
            "WEBP",
            quality=50,
            lossless=True,
            method=6,
        )
        # create thumbnail
        thumbnail_fn = fsr.generate_sdoc_filename(
            payload.filepath, webp=True, thumbnail=True
        )
        im.thumbnail((128, 128))
        im.save(
            thumbnail_fn,
            "WEBP",
            quality=100,
            lossless=True,
            method=6,
        )

    with sqlr.db_session() as db:
        # Set db status
        crud_sdoc_status.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentStatusUpdate(image_thumbnail=True),
        )
