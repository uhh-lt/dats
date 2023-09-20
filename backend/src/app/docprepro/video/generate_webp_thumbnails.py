from io import BytesIO
from pathlib import Path
from typing import List

import ffmpeg
from app.core.data.dto.source_document import SDocStatus
from app.core.data.repo.repo_service import RepoService
from app.docprepro.util import update_sdoc_status
from app.docprepro.video import PreProVideoDoc
from loguru import logger
from PIL import Image
from tqdm import tqdm

repo = RepoService()


def thumbnail(image: BytesIO, filename: Path, thumbnail_size: int = 256):
    with Image.open(BytesIO(image)) as im:
        im.thumbnail((thumbnail_size, thumbnail_size))
        im.save(
            repo.generate_sdoc_filename(filename, webp=True, thumbnail=True),
            "WEBP",
            quality=50,
            lossless=True,
            method=6,
        )


def generate_webp_thumbnails_(ppvds: List[PreProVideoDoc]) -> List[PreProVideoDoc]:
    for ppvd in tqdm(ppvds, desc="Generating .webp thumbnails"):
        filename = ppvd.video_dst
        probe = ffmpeg.probe(filename)
        time = float(probe["format"]["duration"]) // 2

        width = probe["streams"][0]["width"]
        try:
            image, _ = (
                ffmpeg.input(filename, ss=time)
                .filter("scale", width, -1)
                .output("pipe:", vframes=1, format="image2", vcodec="png")
                .run(quiet=True)
            )
        except ffmpeg.Error as e:
            logger.error(e)
        thumbnail(image, filename)
        update_sdoc_status(
            sdoc_id=ppvd.sdoc_id,
            sdoc_status=SDocStatus.generate_webp_thumbnails_from_video,
        )
    return ppvds
