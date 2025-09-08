import logging
from typing import Any

import numpy as np
from faster_whisper import BatchedInferencePipeline
from faster_whisper import WhisperModel as FasterWhisperModel
from ray import serve

from config import build_ray_model_deployment_config, conf
from dto.whisper import (
    SegmentTranscription,
    WhisperTranscriptionOutput,
    WordTranscription,
)

logger = logging.getLogger("ray.serve")

cc = conf.whisper

WHISPER_MODEL = cc.model
DEVICE = cc.device
WHISPER_TRANSCRIBE_OPTIONS = cc.options


@serve.deployment(**build_ray_model_deployment_config("whisper"))
class WhisperModel:
    def __init__(self):
        logger.info(f"Loading Whisper model {WHISPER_MODEL} on {DEVICE}")
        self.model = BatchedInferencePipeline(FasterWhisperModel(WHISPER_MODEL, DEVICE))

    def _get_uncompressed_audio(self, wav_data: np.ndarray) -> np.ndarray:
        audio_array = (
            np.frombuffer(wav_data, np.int16).flatten().astype(np.float32) / 32768.0
        )
        return audio_array

    def transcribe_fpi(
        self, wav_data: np.ndarray, language: str | None = None
    ) -> WhisperTranscriptionOutput:
        audio_array = self._get_uncompressed_audio(wav_data)

        logger.debug(
            f"Generating automatic transcription using Whisper '{WHISPER_MODEL}'!"
        )
        transcribe_options: dict[str, Any] = dict(
            task="transcribe", **WHISPER_TRANSCRIBE_OPTIONS
        )

        transcriptions, info = self.model.transcribe(
            audio=audio_array, language=language, **transcribe_options
        )
        transcriptions = list(transcriptions)

        segments: list[SegmentTranscription] = []
        for segment in transcriptions:
            words: list[WordTranscription] = []
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

        return WhisperTranscriptionOutput(
            segments=segments,
            language=info.language,
            language_probability=info.language_probability,
        )
