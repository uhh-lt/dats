import ffmpeg
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.video.preprovideodoc import PreProVideoDoc
from loguru import logger


def create_and_store_audio_stream_file(cargo: PipelineCargo) -> PipelineCargo:
    ppvd: PreProVideoDoc = cargo.data["ppvd"]
    # TODO: Multiple periods in filename will cause issues
    audio_filepath = ppvd.filepath.with_suffix(".mp3")

    try:
        # convert the video to an audio stream
        (
            ffmpeg.input(str(ppvd.filepath))
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
            f"IOError while creating the audio stream file {str(ppvd.audio_filepath)}!"
            f"\n{e}"
        )
        raise e
    except ffmpeg.Error as e:
        msg = (
            f"while creating the audio stream file {str(ppvd.audio_filepath)}!"
            f"\n{e.stderr.decode()}"
        )
        logger.error(msg)
        raise IOError(msg)

    ppvd.audio_filepath = audio_filepath

    return cargo
