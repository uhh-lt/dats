import logging

from fastapi import FastAPI, Request
from ray import serve
from ray.serve.handle import DeploymentHandle

from dto.whisper import WhisperTranscriptionOutput
from models.whisper import WhisperModel
from utils import bytes_to_wav_data

api = FastAPI()

logger = logging.getLogger("ray.serve")


@serve.deployment(num_replicas=1, name="whisper", max_ongoing_requests=128)
@serve.ingress(api)
class WhisperApi:
    def __init__(self, whisper_model_handle: DeploymentHandle) -> None:
        self.whisper = whisper_model_handle

    @api.post(
        "/transcribe",
        response_model=WhisperTranscriptionOutput,
    )
    async def transcribe(
        self, request: Request, language: str | None = None
    ) -> WhisperTranscriptionOutput:
        # we are expecting a wav file as binary data (application/octet-stream)
        raw_wav_bytes = await request.body()
        wav_data = bytes_to_wav_data(raw_wav_bytes)
        transcript_result = await self.whisper.transcribe_fpi.remote(wav_data, language)  # type: ignore
        return transcript_result


app = WhisperApi.bind(
    whisper_model_handle=WhisperModel.bind(),
)
