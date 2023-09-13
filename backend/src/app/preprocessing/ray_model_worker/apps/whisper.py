import logging

from dto.whisper import WhisperInput, WhisperOutput
from fastapi import FastAPI
from models.whisper import WhisperModel
from ray import serve
from ray.serve.handle import RayServeHandle

api = FastAPI()

logger = logging.getLogger("ray.serve")

tempPath = "/tmp/"
WHISPER_MODEL = "tiny"
DEVICE = "cuda"
DOWNLOAD_DIR = "/models_cache/"


@serve.deployment(num_replicas=1, route_prefix="/whisper")
@serve.ingress(api)
class WhisperApi:
    def __init__(self, whisper_model_handle: RayServeHandle) -> None:
        self.whisper = whisper_model_handle

    @api.post(
        "/transcribe",
        responses={200: {"content": {"application/json": {}}}},
        response_model=WhisperOutput,
    )
    async def transcribe(self, input: WhisperInput) -> WhisperOutput:
        transcript_ref = await self.whisper.transcribe.remote(
            input.uncompressed_audio_fp
        )
        transcript_result = await transcript_ref
        return transcript_result


app = WhisperApi.bind(
    whisper_model_handle=WhisperModel.bind(),
)
