from pathlib import Path

from common.job_type import JobType
from PIL import Image
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job, JobInputBase
from systems.job_system.job_register_decorator import register_job

fsr: FilesystemRepo = FilesystemRepo()
sqlr = SQLRepo()


class ImageThumbnailJobInput(JobInputBase):
    filepath: Path
    sdoc_id: int


@register_job(
    job_type=JobType.IMAGE_THUMBNAIL,
    input_type=ImageThumbnailJobInput,
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
