import logging

from dto.detr import DETRImageInput, DETRObjectDetectionOutput
from fastapi import FastAPI
from models.detr import DETRModel
from ray import serve
from ray.serve.handle import DeploymentHandle

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(num_replicas=1, route_prefix="/detr")
@serve.ingress(api)
class DbertApi:
    def __init__(self, detr_model_handle: DeploymentHandle) -> None:
        self.detr = detr_model_handle

    @api.post("/object_detection", response_model=DETRObjectDetectionOutput)
    async def object_detection(self, input: DETRImageInput):
        predict_result = await self.detr.object_detection.remote(input)  # type: ignore
        return predict_result


app = DbertApi.bind(
    detr_model_handle=DETRModel.bind(),
)
