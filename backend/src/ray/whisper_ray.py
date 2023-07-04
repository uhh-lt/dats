from ray import serve
import whisper_timestamped as whisper
from fastapi import APIRouter, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
import logging

router = APIRouter()

logger = logging.getLogger("ray.serve")

@serve.deployment(num_replicas=1)
@serve.ingress(router)
class APIIngress:
    def __init__(self, whisper_model_handle) -> None:
        self.whisper = whisper_model_handle

    @router.post(
        "/upload/",
        responses={200: {"content": {"application/json": {}}}},
        response_class=JSONResponse,
    )
    async def upload(self, audiofile: UploadFile):
        contents = audiofile.file.read()
        filepath = f"/tmp/{audiofile.filename}"
        with open(filepath, "wb") as f:
            f.write(contents)
        logger.info("upload successfull")
        logger.info(f"{filepath=}")
        transcript_ref = await self.whisper.transcribe.remote(filepath)
        transcript = await transcript_ref
        logger.debug(transcript)
        transcript_json = jsonable_encoder(transcript)
        return JSONResponse(content=transcript_json)


@serve.deployment(
    ray_actor_options={"num_gpus": 1},
    autoscaling_config={"min_replicas": 0, "max_replicas": 1},
)

class WhisperT:

    def __init__(self):
        model = "tiny"
        device = "cuda"
        self.model = whisper.load_model(model, device, "/entry/model/")

    def transcribe(self, input_audio: str):
        self.transcription = whisper.transcribe(self.model, input_audio)
        return self.transcription
