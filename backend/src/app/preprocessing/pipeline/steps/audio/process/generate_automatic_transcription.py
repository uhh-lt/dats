from pathlib import Path

from loguru import logger

from app.core.data.dto.source_document_data import WordLevelTranscription
from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.whisper import (
    WhisperTranscriptionOutput,
)

rms = RayModelService()


def generate_automatic_transcription(cargo: PipelineCargo) -> PipelineCargo:
    ppad: PreProAudioDoc = cargo.data["ppad"]
    if len(ppad.word_level_transcriptions) == 0:
        # TODO: Could there be an empty transcript because nothing was said?
        logger.debug(f"Generating automatic transcription for {ppad.filename} ...")
        if ppad.uncompressed_audio_filepath is None:
            raise ValueError(
                f"Uncompressed audio filepath for {ppad.filename} is None. "
                "Please run the 'convert_to_pcm' step first!"
            )

        # read the audio file as bytes to be sent to the whisper model
        audio_fp = Path(ppad.uncompressed_audio_filepath)
        if not audio_fp.exists():
            raise FileNotFoundError(
                f"Uncompressed audio file {ppad.uncompressed_audio_filepath} not found!"
            )
        audio_bytes = audio_fp.read_bytes()
        if len(audio_bytes) == 0:
            raise ValueError(
                f"Uncompressed audio file {ppad.uncompressed_audio_filepath} is empty!"
            )

        # send the audio bytes to the whisper model to get the transcript
        transcription: WhisperTranscriptionOutput = rms.whisper_transcribe(
            audio_bytes=audio_bytes
        )
        logger.info(f"Generated transcript {transcription}")

        # Create Wordlevel Transcriptions
        # use whisper tokenization
        for segment in transcription.segments:
            for word in segment.words:
                text = word.text.strip()
                wlt = WordLevelTranscription(
                    text=text,
                    start_ms=word.start_ms,
                    end_ms=word.end_ms,
                )
                ppad.word_level_transcriptions.append(wlt)

    else:
        logger.info("Import word level transcriptions")

    current_position = 0
    ppad.tokens = []
    ppad.token_character_offsets = []
    for wlt in ppad.word_level_transcriptions:
        ppad.tokens.append(wlt.text)
        current_word_length = len(wlt.text)
        ppad.token_character_offsets.append(
            (current_position, current_position + current_word_length)
        )
        current_position += current_word_length + 1

    return cargo
