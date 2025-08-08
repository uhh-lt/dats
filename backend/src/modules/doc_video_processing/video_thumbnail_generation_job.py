from io import BytesIO
from pathlib import Path

import ffmpeg
from common.job_type import JobType
from PIL import Image
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job, JobInputBase
from systems.job_system.job_register_decorator import register_job

fsr = FilesystemRepo()
sqlr = SQLRepo()


class VideoThumbnailJobInput(JobInputBase):
    sdoc_id: int
    filepath: Path


@register_job(
    job_type=JobType.VIDEO_THUMBNAIL,
    input_type=VideoThumbnailJobInput,
)
def handle_video_thumbnail_job(payload: VideoThumbnailJobInput, job: Job) -> None:
    start_frame, err = (
        ffmpeg.input(payload.filepath, ss=0)
        .output("pipe:", vframes=1, format="image2", vcodec="png")
        .run(quiet=True)
    )

    thumbnail_filename = fsr.generate_sdoc_filename(
        payload.filepath, webp=True, thumbnail=True
    )
    with Image.open(BytesIO(start_frame)) as im:
        im.thumbnail((256, 256))
        im.save(
            thumbnail_filename,
            "WEBP",
            quality=50,
            lossless=True,
            method=6,
        )
