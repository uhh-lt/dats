import logging
import os
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import torch
import whisper_timestamped
from config import conf
from dto.whisper import (
    SegmentTranscription,
    WhisperFilePathInput,
    WhisperTranscriptionOutput,
    WordTranscription,
)
from ray import serve
from scipy.io import wavfile

logger = logging.getLogger("ray.serve")

cc = conf.whisper

WHISPER_MODEL = cc.model
DEVICE = cc.device
DOWNLOAD_DIR = os.environ["TRANSFORMERS_CACHE"]
WHISPER_TRANSCRIBE_OPTIONS = cc.options


@serve.deployment(
    ray_actor_options={"num_gpus": 1},
    autoscaling_config={
        "min_replicas": 0,
        "max_replicas": 2,
    },
)
class WhisperModel:
    def __init__(self):
        logger.info(f"Loading Whisper model {WHISPER_MODEL} on {DEVICE}")
        self.model = whisper_timestamped.load_model(
            WHISPER_MODEL, DEVICE, download_root=DOWNLOAD_DIR
        )
        self.model.eval()

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
            transcription: Dict[str, Any] = whisper_timestamped.transcribe(
                self.model, audionp, **transcribe_options
            )

        segments: List[SegmentTranscription] = []
        for segment in transcription["segments"]:
            words: List[WordTranscription] = []
            st = SegmentTranscription(
                start_ms=int(segment["start"] * 1000),
                end_ms=int(segment["end"] * 1000),
            )
            for w in segment["words"]:
                words.append(
                    WordTranscription(
                        text=w["text"],
                        start_ms=int(w["start"] * 1000),
                        end_ms=int(w["end"] * 1000),
                    )
                )
            st.words = words
            segments.append(st)

        return WhisperTranscriptionOutput(segments=segments)
