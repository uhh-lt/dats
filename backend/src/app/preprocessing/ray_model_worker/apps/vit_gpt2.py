import logging

from dto.vit_gpt2 import ViTGPT2FilePathInput, ViTGPT2Output
from fastapi import FastAPI
from models.vit_gpt2 import ViTGPT2Model
from ray import serve
from ray.serve.handle import RayServeHandle

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(num_replicas=1, route_prefix="/vit_gpt2")
@serve.ingress(api)
class ViTGPT2Api:
    def __init__(self, vit_gpt2_model_handle: RayServeHandle) -> None:
        self.vit_gpt2 = vit_gpt2_model_handle

    @api.post("/image_cationing", response_model=ViTGPT2Output)
    async def classify(self, input: ViTGPT2FilePathInput):
        predict_ref = await self.vit_gpt2.image_cationing.remote(input)
        predict_result = await predict_ref
        return predict_result


app = ViTGPT2Api.bind(
    vit_gpt2_model_handle=ViTGPT2Model.bind(),
)
