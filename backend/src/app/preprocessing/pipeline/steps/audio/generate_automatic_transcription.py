from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.audio.wordleveltranscription import (
    WordLevelTranscription,
)
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.whisper import (
    WhisperFilePathInput,
    WhisperTranscriptionOutput,
)
from loguru import logger

rms = RayModelService()


def generate_automatic_transcription(cargo: PipelineCargo) -> PipelineCargo:
    ppad: PreProAudioDoc = cargo.data["ppad"]
    logger.debug(f"Generating automatic transcription for {ppad.filename} ...")
    if ppad.uncompressed_audio_filepath is None:
        raise ValueError(
            f"Uncompressed audio filepath for {ppad.filename} is None. "
            "Please run the 'convert_to_pcm' step first!"
        )

    # Create Whisper Input
    whisper_input = WhisperFilePathInput(
        uncompressed_audio_fp=str(ppad.uncompressed_audio_filepath)
    )
    transcription: WhisperTranscriptionOutput = rms.whisper_transcribe(whisper_input)

    # Create Wordlevel Transcriptions
    for segment in transcription.segments:
        for word in segment.words:
            wlt = WordLevelTranscription(
                text=word.text,
                start_ms=word.start_ms,
                end_ms=word.end_ms,
            )
            ppad.word_level_transcriptions.append(wlt)

    return cargo
