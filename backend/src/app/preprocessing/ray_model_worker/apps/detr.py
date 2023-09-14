import logging

from dto.detr import DETRFilePathInput, DETRObjectDetectionOutput
from fastapi import FastAPI
from models.detr import DETRModel
from ray import serve
from ray.serve.handle import RayServeHandle

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(num_replicas=1, route_prefix="/detr")
@serve.ingress(api)
class DbertApi:
    def __init__(self, detr_model_handle: RayServeHandle) -> None:
        self.detr = detr_model_handle

    @api.post("/object_detection", response_model=DETRObjectDetectionOutput)
    async def object_detection(self, input: DETRFilePathInput):
        predict_ref = await self.detr.object_detection.remote(input)
        predict_result = await predict_ref
        return predict_result


app = DbertApi.bind(
    detr_model_handle=DETRModel.bind(),
)