from io import BytesIO
from pathlib import Path

import ffmpeg
from loguru import logger
from PIL import Image

from core.artefacts.audio.audio_file_crud import AUDIO_FILENAME, crud_audio_file
from core.artefacts.thumbnail.image_thumbnail_utils import webp_bytes
from core.artefacts.thumbnail.thumbnail_file_crud import (
    THUMBNAIL_FILENAME,
    crud_thumbnail_file,
)


def store_video_thumbnail(*, project_id: int, sdoc_id: int, video_path: Path) -> None:
    """Writes the thumbnail of the video's first frame."""
    start_frame, err = (
        ffmpeg.input(video_path, ss=0)
        .output("pipe:", vframes=1, format="image2", vcodec="png")
        .run(quiet=True)
    )
    with Image.open(BytesIO(start_frame)) as im:
        im.thumbnail((256, 256))
        crud_thumbnail_file.write(
            project_id=project_id,
            id=sdoc_id,
            name=THUMBNAIL_FILENAME,
            data=webp_bytes(im),
        )


def extract_audio_stream(*, project_id: int, sdoc_id: int, video_path: Path) -> Path:
    """Writes the audio stream of the video document to its audio file and
    returns its path."""
    audio_filepath = crud_audio_file.path(
        project_id=project_id, id=sdoc_id, name=AUDIO_FILENAME
    )
    audio_filepath.parent.mkdir(parents=True, exist_ok=True)

    try:
        # convert the video to an audio stream
        (
            ffmpeg.input(str(video_path))
            .output(
                str(audio_filepath),
                acodec="libmp3lame",
                ac=2,
                audio_bitrate="192k",
            )
            .overwrite_output()
            .run(quiet=True)
        )
    except IOError as e:
        logger.error(
            f"IOError while creating the audio stream file {str(audio_filepath)}!\n{e}"
        )
        raise e
    except ffmpeg.Error as e:
        msg = (
            f"while creating the audio stream file {str(audio_filepath)}!"
            f"\n{e.stderr.decode()}"
        )
        logger.error(msg)
        raise IOError(msg)

    return audio_filepath
