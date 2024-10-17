import logging
import os
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import torch
from dto.whisper import (
    SegmentTranscription,
    WhisperFilePathInput,
    WhisperTranscriptionOutput,
    WordTranscription,
)
from faster_whisper import WhisperModel as wm
from ray import serve
from ray_config import build_ray_model_deployment_config, conf
from scipy.io import wavfile

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
        self.model = wm(WHISPER_MODEL, DEVICE, download_root=DOWNLOAD_DIR)

    def _load_uncompressed_audio(self, uncompressed_audio_fp: str) -> np.ndarray:
        fp = Path(uncompressed_audio_fp)
        assert fp.exists(), f"File {fp} does not exist."
        assert fp.suffix == ".wav", f"File {fp} is not a wav file."

        audiodata = wavfile.read(fp)[1]
        audionp = (
            np.frombuffer(audiodata, np.int16).flatten().astype(np.float32) / 32768.0
        )
        return audionp

    def transcribe_fpi(self, input: WhisperFilePathInput) -> WhisperTranscriptionOutput:
        audionp = self._load_uncompressed_audio(input.uncompressed_audio_fp)

        logger.debug(
            (
                f"Generating automatic transcription of {input.uncompressed_audio_fp}"
                f" using Whisper '{WHISPER_MODEL}'!"
            )
        )
        transcribe_options: Dict[str, Any] = dict(
            task="transcribe", **WHISPER_TRANSCRIBE_OPTIONS
        )

        with torch.no_grad():
            result = self.model.transcribe(audio=audionp, **transcribe_options)
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
