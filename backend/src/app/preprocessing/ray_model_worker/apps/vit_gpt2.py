import logging

from dto.vit_gpt2 import ViTGPT2FilePathInput, ViTGPT2Output
from fastapi import FastAPI
from models.vit_gpt2 import ViTGPT2Model
from ray import serve
from ray.serve.handle import DeploymentHandle

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(num_replicas=1, route_prefix="/vit_gpt2")
@serve.ingress(api)
class ViTGPT2Api:
    def __init__(self, vit_gpt2_model_handle: DeploymentHandle) -> None:
        self.vit_gpt2 = vit_gpt2_model_handle

    @api.post("/image_captioning", response_model=ViTGPT2Output)
    async def image_captioning(self, input: ViTGPT2FilePathInput):
        predict_result = await self.vit_gpt2.image_captioning.remote(input)
        return predict_result


app = ViTGPT2Api.bind(
    vit_gpt2_model_handle=ViTGPT2Model.bind(),
)
