import os
from functools import lru_cache
from typing import Any, Dict

import numpy as np
import torch
import whisper_timestamped
from loguru import logger
from scipy.io import wavfile

from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.audio.wordleveltranscription import (
    WordLevelTranscription,
)
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from config import conf

WHISPER_MODEL = conf.docprepro.audio.whisper.model
DEVICE = conf.docprepro.audio.whisper.device
DOWNLOAD_DIR = os.environ["TRANSFORMERS_CACHE"]
WHISPER_TRANSCRIBE_OPTIONS = conf.docprepro.audio.whisper.options

torch.set_num_threads(1)


@lru_cache(maxsize=1)
def load_whisper_model() -> whisper_timestamped.Whisper:
    logger.debug("Loading whisper Model")
    whisper_model = whisper_timestamped.load_model(
        WHISPER_MODEL, DEVICE, download_root=DOWNLOAD_DIR
    )
    return whisper_model


def generate_automatic_transcription(cargo: PipelineCargo) -> PipelineCargo:
    ppad: PreProAudioDoc = cargo.data["ppad"]

    # Load uncompressed audiofile
    wav_file = str(ppad.uncompressed_audio_filepath)
    audiodata = wavfile.read(wav_file)[1]

    audionp = np.frombuffer(audiodata, np.int16).flatten().astype(np.float32) / 32768.0

    whisper_model = load_whisper_model()

    logger.debug(
        (
            f"Generating automatic transcription of {ppad.filepath}"
            f" using Whisper '{WHISPER_MODEL}'!"
        )
    )
    transcribe_options: Dict[str, Any] = dict(
        task="transcribe", **WHISPER_TRANSCRIBE_OPTIONS
    )
    result = whisper_timestamped.transcribe(
        whisper_model, audionp, **transcribe_options
    )

    # Create Wordlevel Transcriptions
    for segment in result["segments"]:
        for word in segment["words"]:
            wlt = WordLevelTranscription(
                text=word["text"],
                start_ms=int(word["start"] * 1000),
                end_ms=int(word["end"] * 1000),
            )
            ppad.word_level_transcriptions.append(wlt)

    return cargo
