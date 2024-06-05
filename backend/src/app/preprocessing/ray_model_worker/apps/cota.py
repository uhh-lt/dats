import logging

from dto.cota import RayCOTARefinementJob
from fastapi import FastAPI
from models.cota import CotaModel
from ray import serve
from ray.serve.handle import DeploymentHandle

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(num_replicas=1, route_prefix="/cota")
@serve.ingress(api)
class CotaApi:
    def __init__(self, cota_model_handle: DeploymentHandle) -> None:
        self.cota = cota_model_handle

    @api.post("/refinement", response_model=RayCOTARefinementJob)
    async def refinement(self, input: RayCOTARefinementJob):
        refinement_result = await self.cota.refinement.remote(input)
        return refinement_result


app = CotaApi.bind(
    cota_model_handle=CotaModel.bind(),
)
