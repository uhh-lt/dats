import logging

from dto.clip import (
    ClipEmbeddingOutput,
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from fastapi import FastAPI
from models.clip import ClipModel
from ray import serve
from ray.serve.handle import RayServeHandle

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(num_replicas=1, route_prefix="/clip")
@serve.ingress(api)
class ClipApi:
    def __init__(self, clip_model_handle: RayServeHandle) -> None:
        self.clip = clip_model_handle

    @api.post("/embedding/text", response_model=ClipEmbeddingOutput)
    async def text_embedding(self, input: ClipTextEmbeddingInput):
        predict_ref = await self.clip.text_embedding.remote(input)
        predict_result = await predict_ref
        return predict_result

    @api.post("/embedding/image", response_model=ClipEmbeddingOutput)
    async def image_embedding(self, input: ClipImageEmbeddingInput):
        predict_ref = await self.clip.image_embedding.remote(input)
        predict_result = await predict_ref
        return predict_result


app = ClipApi.bind(
    clip_model_handle=ClipModel.bind(),
)