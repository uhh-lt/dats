from pathlib import Path

from PIL import Image

from common.job_type import JobType
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

fsr: FilesystemRepo = FilesystemRepo()
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


@register_job(
    job_type=JobType.IMAGE_THUMBNAIL,
    input_type=ImageThumbnailJobInput,
)
def handle_image_thumbnail_job(payload: ImageThumbnailJobInput, job: Job) -> None:
    generate_thumbnails(payload.filepath)
