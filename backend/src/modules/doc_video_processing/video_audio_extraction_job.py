from pathlib import Path

import ffmpeg
from common.job_type import JobType
from loguru import logger
from systems.job_system.job_dto import Job, JobOutputBase, SdocJobInput
from systems.job_system.job_register_decorator import register_job


class VideoAudioExtractionJobInput(SdocJobInput):
    filepath: Path


class VideoAudioExtractionJobOutput(JobOutputBase):
    filepath: Path


@register_job(
    job_type=JobType.VIDEO_AUDIO_EXTRACTION,
    input_type=VideoAudioExtractionJobInput,
    output_type=VideoAudioExtractionJobOutput,
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
