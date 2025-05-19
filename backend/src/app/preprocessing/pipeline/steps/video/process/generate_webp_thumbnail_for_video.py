from io import BytesIO

import ffmpeg
from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.video.preprovideodoc import PreProVideoDoc
from loguru import logger
from PIL import Image

repo = RepoService()


def generate_webp_thumbnail_for_video(cargo: PipelineCargo) -> PipelineCargo:
    ppvd: PreProVideoDoc = cargo.data["ppvd"]

    assert isinstance(ppvd.metadata["duration"], str), "Duration is not a string"
    assert isinstance(ppvd.metadata["width"], str), "Width is not a string"

    half_time = float(ppvd.metadata["duration"]) // 2
    frame_width = int(ppvd.metadata["width"])

    try:
        # get the frame at half time of the video
        half_time_frame, err = (
            ffmpeg.input(ppvd.filepath, ss=half_time)
            .filter("scale", frame_width, -1)
            .output("pipe:", vframes=1, format="image2", vcodec="png")
            .run(quiet=True)
        )

    except ffmpeg.Error as e:
        msg = (
            f"FFMPEG Error while generating thumbnail for {ppvd.filename}:"
            f"{e.stderr.decode()}"
        )
        logger.error(msg)
        raise IOError(msg)

    thumbnail_filename = repo.generate_sdoc_filename(
        ppvd.filepath, webp=True, thumbnail=True
    )
    with Image.open(BytesIO(half_time_frame)) as im:
        im.thumbnail((256, 256))
        im.save(
            thumbnail_filename,
            "WEBP",
            quality=50,
            lossless=True,
            method=6,
        )

    return cargo
