import logging

from dto.clip import (
    ClipEmbeddingOutput,
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from fastapi import FastAPI
from models.clip import ClipModel
from ray import serve
from ray.serve.handle import DeploymentHandle

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(num_replicas=1, name="clip", max_ongoing_requests=128)
@serve.ingress(api)
class ClipApi:
    def __init__(self, clip_model_handle: DeploymentHandle) -> None:
        self.clip = clip_model_handle

    @api.post("/embedding/text", response_model=ClipEmbeddingOutput)
    async def text_embedding(self, input: ClipTextEmbeddingInput):
        predict_result = await self.clip.text_embedding.remote(input)  # type: ignore
        return predict_result

    @api.post("/embedding/image", response_model=ClipEmbeddingOutput)
    async def image_embedding(self, input: ClipImageEmbeddingInput):
        predict_result = await self.clip.image_embedding.remote(input)  # type: ignore
        return predict_result


app = ClipApi.bind(
    clip_model_handle=ClipModel.bind(),
)
