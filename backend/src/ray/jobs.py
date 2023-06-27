#!/usr/bin/env python3

from fastapi import FastAPI, File, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from ray import serve
# import whisper_ray
import logging

logger = logging.getLogger("ray.serve")

app = FastAPI()


@serve.deployment(num_replicas=1, route_prefix="/")
@serve.ingress(app)
class APIIngress:
    def __init__(self, whisper_model_handle) -> None:
        self.handle = whisper_model_handle

    @app.post(
        "/upload/",
        responses={200: {"content": {"application/json": {}}}},
        response_class=JSONResponse,
    )
    async def upload(self, xyz: UploadFile):
        contents = xyz.file.read()
        filepath = f"/tmp/{xyz.filename}"
        with open(filepath, "wb") as f:
            f.write(contents)
        logger.info("upload successfull")
        logger.info(f"{filepath=}")
        transcript_ref = await self.handle.transcribe.remote(filepath)
        transcript = await transcript_ref
        logger.debug(transcript)
        transcript_json = jsonable_encoder(transcript)
        return JSONResponse(content=transcript_json)


import whisper_timestamped as whisper

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


whisper_deploy = APIIngress.bind(WhisperT.bind())
# serve.run()
# whisper_deploy = APIIngress.bind(WhisperT.bind())
