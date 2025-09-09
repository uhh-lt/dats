import logging

from fastapi import FastAPI
from ray import serve
from ray.serve.handle import DeploymentHandle

from config import build_ray_api_deployment_config
from dto.clip import (
    ClipEmbeddingOutput,
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from models.clip import ClipModel

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(**build_ray_api_deployment_config("clip"))
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
