from ray import serve
import whisper_timestamped as whisper
from fastapi import APIRouter
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from scipy.io import wavfile
import ffmpeg
import numpy as np

import logging

router = APIRouter()

logger = logging.getLogger("ray.serve")

tempPath = "/tmp/"
WHISPER_MODEL = "tiny"
DEVICE = "cuda"
DOWNLOAD_DIR = "/models_cache/"

@serve.deployment(num_replicas=1)
@serve.ingress(router)
class APIIngress:
    def __init__(self, whisper_model_handle) -> None:
        self.whisper = whisper_model_handle

    @router.post(
        "/transcribe/",
        responses={200: {"content": {"application/json": {}}}},
        response_class=JSONResponse,
    )
    async def transcribe(self, file_path: str):
        transcript_ref = await self.whisper.transcribe.remote(file_path)
        transcript = await transcript_ref
        transcript_json = jsonable_encoder(transcript)
        return JSONResponse(content=transcript_json)


@serve.deployment(
    ray_actor_options={"num_gpus": 1},
    autoscaling_config={"min_replicas": 0, "max_replicas": 1},
)

class WhisperT:

    def convert(self, file_path: str) -> str:
        file_path_uncompressed = f"{file_path}.uncompressed.wav"
        # Create 16khz Mono PCM File
        try:
            (
                ffmpeg.input(file_path)
                .output(str(file_path_uncompressed), acodec="pcm_s16le", ac=1, ar="16k")
                .overwrite_output()
                .run(quiet=True)
            )
        except ffmpeg.Error as e:
            logger.error(e)

        return file_path_uncompressed

    def __init__(self):
        self.model = whisper.load_model(WHISPER_MODEL, DEVICE, DOWNLOAD_DIR)

    def transcribe(self, file_path: str):
        file_path_uncompressed = self.convert(file_path)
        audiodata = wavfile.read(file_path_uncompressed)[1]
        audionp = (
            np.frombuffer(audiodata, np.int16).flatten().astype(np.float32) / 32768.0
        )
        self.transcription = whisper.transcribe(self.model, audionp)
        return self.transcription
