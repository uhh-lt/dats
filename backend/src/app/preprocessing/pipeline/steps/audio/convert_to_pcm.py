import ffmpeg
from loguru import logger

from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


def convert_to_pcm(cargo: PipelineCargo) -> PipelineCargo:
    ppad: PreProAudioDoc = cargo.data["ppad"]

    wav_file = ppad.filepath.with_suffix(".uncompressed.wav")

    logger.debug(f"Creating 16khz Mono PCM from {ppad.filepath}")
    try:
        (
            ffmpeg.input(ppad.filepath)
            .output(str(wav_file), acodec="pcm_s16le", ac=1, ar="16k")
            .overwrite_output()
            .run(quiet=True)
        )
    except ffmpeg.Error as e:
        logger.error(e.stderr.decode())

    ppad.uncompressed_audio_filepath = wav_file

    return cargo
