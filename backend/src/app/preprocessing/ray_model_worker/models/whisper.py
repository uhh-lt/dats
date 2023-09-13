import logging

import numpy as np
import whisper_timestamped as whisper
from dto.whisper import WhisperInput, WhisperOutput
from ray import serve
from scipy.io import wavfile

logger = logging.getLogger("ray.serve")

tempPath = "/tmp/"
WHISPER_MODEL = "tiny"
DEVICE = "cuda"
DOWNLOAD_DIR = "/models_cache/"


@serve.deployment(
    ray_actor_options={"num_gpus": 1},
    autoscaling_config={
        "min_replicas": 0,
        "max_replicas": 1,
    },
)
class WhisperModel:
    def __init__(self):
        self.model = whisper.load_model(WHISPER_MODEL, DEVICE, DOWNLOAD_DIR)

    def transcribe(self, input: WhisperInput) -> WhisperOutput:
        fp = input.uncompressed_audio_fp
        audiodata = wavfile.read(fp)[1]
        audionp = (
            np.frombuffer(audiodata, np.int16).flatten().astype(np.float32) / 32768.0
        )
        self.transcription = whisper.transcribe(self.model, audionp)
        return WhisperOutput(out=self.transcription)
