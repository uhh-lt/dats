import logging

from fastapi import FastAPI
from ray import serve
from ray.serve.handle import DeploymentHandle

from dto.cota import RayCOTAJobInput, RayCOTAJobResponse
from models.cota import CotaModel

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(num_replicas=1, name="cota", max_ongoing_requests=128)
@serve.ingress(api)
class CotaApi:
    def __init__(self, cota_model_handle: DeploymentHandle) -> None:
        self.cota = cota_model_handle

    @api.post("/finetune_apply_compute", response_model=RayCOTAJobResponse)
    async def finetune_apply_compute(self, input: RayCOTAJobInput):
        return await self.cota.finetune_apply_compute.remote(input)  # type: ignore


app = CotaApi.bind(
    cota_model_handle=CotaModel.bind(),
)
