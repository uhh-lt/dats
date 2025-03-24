import logging
import os
from typing import Any, Dict, List

import numpy as np
import torch
from dto.whisper import (
    SegmentTranscription,
    WhisperTranscriptionOutput,
    WordTranscription,
)
from faster_whisper import WhisperModel as FasterWhisperModel
from ray import serve
from ray_config import build_ray_model_deployment_config, conf

logger = logging.getLogger("ray.serve")

cc = conf.whisper

WHISPER_MODEL = cc.model
DEVICE = cc.device
DOWNLOAD_DIR = os.environ["TRANSFORMERS_CACHE"]
WHISPER_TRANSCRIBE_OPTIONS = cc.options


@serve.deployment(**build_ray_model_deployment_config("whisper"))
class WhisperModel:
    def __init__(self):
        logger.info(f"Loading Whisper model {WHISPER_MODEL} on {DEVICE}")
        self.model = FasterWhisperModel(
            WHISPER_MODEL, DEVICE, download_root=DOWNLOAD_DIR
        )

    def _get_uncompressed_audio(self, wav_data: np.ndarray) -> np.ndarray:
        audio_array = (
            np.frombuffer(wav_data, np.int16).flatten().astype(np.float32) / 32768.0
        )
        return audio_array

    def transcribe_fpi(self, wav_data: np.ndarray) -> WhisperTranscriptionOutput:
        audio_array = self._get_uncompressed_audio(wav_data)

        logger.debug(
            f"Generating automatic transcription using Whisper '{WHISPER_MODEL}'!"
        )
        transcribe_options: Dict[str, Any] = dict(
            task="transcribe", **WHISPER_TRANSCRIBE_OPTIONS
        )

        with torch.no_grad():
            result = self.model.transcribe(audio=audio_array, **transcribe_options)
            transcriptions = list(result[0])

        segments: List[SegmentTranscription] = []
        for segment in transcriptions:
            words: List[WordTranscription] = []
            st = SegmentTranscription(
                start_ms=int(segment.start * 1000),
                end_ms=int(segment.end * 1000),
            )
            if segment.words is None:
                continue

            for word in segment.words:
                words.append(
                    WordTranscription(
                        text=word.word,
                        start_ms=int(word.start * 1000),
                        end_ms=int(word.end * 1000),
                    )
                )
            st.words = words
            segments.append(st)

        return WhisperTranscriptionOutput(segments=segments)
