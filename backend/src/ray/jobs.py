#!/usr/bin/env python3

from fastapi import FastAPI
from ray import serve
import logging

import dbert
import whisper_ray
import spacy_ray

logger = logging.getLogger("ray.serve")

app = FastAPI()

app.include_router(dbert.router, prefix="/dbert")
app.include_router(whisper_ray.router, prefix="/whisper")
app.include_router(spacy_ray.router, prefix="/spacy")

@serve.deployment(num_replicas=1, route_prefix="/")
@serve.ingress(app)
class APIIngress:
    def __init__(self, **kwargs) -> None:
        print(f'{kwargs=}')
        self.whisper = kwargs["whisper_model_handle"]
        self.dbert = kwargs["dbert_model_handle"]
        self.spacyR = kwargs["spacy_model_handle"]

Whisper = whisper_ray.WhisperT.bind()

DBert = dbert.DistilBertModel.bind()

Spacy = spacy_ray.Space.bind()

deploy = APIIngress.bind(whisper_model_handle=Whisper, dbert_model_handle=DBert, spacy_model_handle=Spacy)