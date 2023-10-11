import logging

from dto.blip2 import Blip2FilePathInput, Blip2Output
from fastapi import FastAPI
from models.blip2 import Blip2Model
from ray import serve
from ray.serve.handle import RayServeHandle

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(num_replicas=1, route_prefix="/blip2")
@serve.ingress(api)
class Blip2Api:
    def __init__(self, blip2_model_handle: RayServeHandle) -> None:
        self.blip2 = blip2_model_handle

    @api.post("/image_captioning", response_model=Blip2Output)
    async def classify(self, input: Blip2FilePathInput):
        predict_ref = await self.blip2.image_captioning.remote(input)
        predict_result = await predict_ref
        return predict_result


app = Blip2Api.bind(
    blip2_model_handle=Blip2Model.bind(),
)
