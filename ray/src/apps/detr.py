import logging

from fastapi import FastAPI
from ray import serve
from ray.serve.handle import DeploymentHandle

from config import build_ray_api_deployment_config
from dto.detr import DETRImageInput, DETRObjectDetectionOutput
from models.detr import DETRModel

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(**build_ray_api_deployment_config("detr"))
@serve.ingress(api)
class DETRApi:
    def __init__(self, detr_model_handle: DeploymentHandle) -> None:
        self.detr = detr_model_handle

    @api.post("/object_detection", response_model=DETRObjectDetectionOutput)
    async def object_detection(self, input: DETRImageInput):
        predict_result = await self.detr.object_detection.remote(input)  # type: ignore
        return predict_result


app = DETRApi.bind(
    detr_model_handle=DETRModel.bind(),
)
