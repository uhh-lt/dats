#!/usr/bin/env python3

import logging

from deployments.dbert import DistilBertDeployment
from deployments.dbert import router as dbert_router
from deployments.spacy import SpacyDeployment
from deployments.spacy import router as spacy_router
from deployments.whisper import WhisperDeployment
from deployments.whisper import router as whisper_router
from fastapi import FastAPI
from ray import serve

logger = logging.getLogger("ray.serve")

api = FastAPI()

api.include_router(dbert_router, prefix="/dbert")
api.include_router(whisper_router, prefix="/whisper")
api.include_router(spacy_router, prefix="/spacy")


@serve.deployment(
    num_replicas=1,
    route_prefix="/",
)
@serve.ingress(api)
class APIIngress:
    def __init__(self, **kwargs) -> None:
        logger.info(f"{kwargs=}")
        self.whisper = kwargs["whisper_model_handle"]
        self.dbert = kwargs["dbert_model_handle"]
        self.spacyR = kwargs["spacy_model_handle"]


Whisper = WhisperDeployment.bind()
DBert = DistilBertDeployment.bind()
Spacy = SpacyDeployment.bind()

app = APIIngress.bind(
    whisper_model_handle=Whisper,
    dbert_model_handle=DBert,
    spacy_model_handle=Spacy,
)
