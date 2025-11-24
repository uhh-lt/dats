from pathlib import Path

import ffmpeg
from loguru import logger

from common.doc_type import DocType
from common.job_type import JobType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

fsr = FilesystemRepo()
sqlr = SQLRepo()


class VideoAudioExtractionJobInput(SdocProcessingJobInput):
    filepath: Path


class VideoAudioExtractionJobOutput(JobOutputBase):
    filepath: Path


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> VideoAudioExtractionJobInput:
    with sqlr.db_session() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        assert sdoc.doctype == DocType.video, (
            f"SourceDocument with {payload.sdoc_id=} is not a video file!"
        )

    video_path = fsr.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)

    return VideoAudioExtractionJobInput(
        **payload.model_dump(),
        filepath=video_path,
    )


@register_job(
    job_type=JobType.VIDEO_AUDIO_EXTRACTION,
    input_type=VideoAudioExtractionJobInput,
    output_type=VideoAudioExtractionJobOutput,
    enricher=enrich_for_recompute,
)
def create_and_store_audio_stream_file(
    payload: VideoAudioExtractionJobInput, job: Job
) -> VideoAudioExtractionJobOutput:
    audio_filepath = payload.filepath.with_suffix(".mp3")

    try:
        # convert the video to an audio stream
        (
            ffmpeg.input(str(payload.filepath))
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

    return VideoAudioExtractionJobOutput(filepath=audio_filepath)
