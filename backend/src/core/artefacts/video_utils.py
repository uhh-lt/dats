from io import BytesIO
from pathlib import Path

import ffmpeg
from loguru import logger
from PIL import Image
from sqlalchemy.orm import Session

from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from core.doc.source_document_dto import SourceDocumentRead
from repos.filesystem_repo import FilesystemRepo

fsr = FilesystemRepo()


def audio_stream_path(video_path: Path) -> Path:
    """The file of the audio stream that `video_audio_extraction` extracts from the
    video at `video_path`, and that `transcription` transcribes."""
    return video_path.with_suffix(".mp3")


def store_video_thumbnail(
    db: Session, sdoc: SourceDocumentRead, video_path: Path
) -> None:
    """Write the thumbnail of the video's first frame next to the video and link
    it as the document's `repo_url`."""
    start_frame, err = (
        ffmpeg.input(video_path, ss=0)
        .output("pipe:", vframes=1, format="image2", vcodec="png")
        .run(quiet=True)
    )

    thumbnail_filename = fsr.generate_sdoc_filename(
        video_path, webp=True, thumbnail=True
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

    # Store link to thumbnail in DB
    repo_url = fsr.get_sdoc_url(sdoc=sdoc, relative=True, webp=True, thumbnail=True)
    crud_sdoc_data.update(
        db=db,
        id=sdoc.id,
        update_dto=SourceDocumentDataUpdate(repo_url=repo_url),
    )


def extract_audio_stream(video_path: Path) -> Path:
    """Write the audio stream of the video to `audio_stream_path(video_path)` and
    return that path."""
    audio_filepath = audio_stream_path(video_path)

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
