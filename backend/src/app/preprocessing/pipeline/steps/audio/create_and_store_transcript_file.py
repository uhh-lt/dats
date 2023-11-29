from loguru import logger

from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


def create_and_store_transcript_file(cargo: PipelineCargo) -> PipelineCargo:
    ppad: PreProAudioDoc = cargo.data["ppad"]
    ppad.transcript_content = " ".join([a.text for a in ppad.word_level_transcriptions])
    ppad.transcript_filepath = ppad.filepath.with_suffix(".transcription.txt")

    try:
        with open(ppad.transcript_filepath, "w") as f:
            f.write(str(ppad.transcript_content))
    except IOError as e:
        logger.error(
            f"Error while creating transcription file {str(ppad.transcript_filepath)}!"
            f"\n{e}"
        )
        raise e
    return cargo
