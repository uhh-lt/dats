#!/usr/bin/env python3

from fastapi import FastAPI, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from ray import serve
# import whisper_ray
import logging
import dbert
import whisper_ray

logger = logging.getLogger("ray.serve")

app = FastAPI()

@serve.deployment(num_replicas=1, route_prefix="/")
@serve.ingress(app)
class APIIngress:
    def __init__(self, whisper_model_handle, dbert_model_handle) -> None:
        self.whisper = whisper_model_handle
        self.dbert = dbert_model_handle

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
        transcript_ref = await self.whisper.transcribe.remote(filepath)
        transcript = await transcript_ref
        logger.debug(transcript)
        transcript_json = jsonable_encoder(transcript)
        return JSONResponse(content=transcript_json)
    
    @app.get("/classify")
    async def classify(self, sentence: str):
        predict_ref = await self.dbert.classify.remote(sentence)
        predict_result = await predict_ref
        return predict_result

Whisper = whisper_ray.WhisperT.bind()

DBert = dbert.DistilBertModel.bind()

deploy = APIIngress.bind(whisper_model_handle=Whisper, dbert_model_handle=DBert)
