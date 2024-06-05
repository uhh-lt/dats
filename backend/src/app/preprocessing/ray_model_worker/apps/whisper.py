import logging

from dto.whisper import WhisperFilePathInput, WhisperTranscriptionOutput
from fastapi import FastAPI
from models.whisper import WhisperModel
from ray import serve
from ray.serve.handle import DeploymentHandle

api = FastAPI()

logger = logging.getLogger("ray.serve")


@serve.deployment(num_replicas=1, route_prefix="/whisper")
@serve.ingress(api)
class WhisperApi:
    def __init__(self, whisper_model_handle: DeploymentHandle) -> None:
        self.whisper = whisper_model_handle

    @api.post(
        "/transcribe",
        response_model=WhisperTranscriptionOutput,
    )
    async def transcribe(
        self, input: WhisperFilePathInput
    ) -> WhisperTranscriptionOutput:
        transcript_result = await self.whisper.transcribe_fpi.remote(input)
        return transcript_result


app = WhisperApi.bind(
    whisper_model_handle=WhisperModel.bind(),
)
