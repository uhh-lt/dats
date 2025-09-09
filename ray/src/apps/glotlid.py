import logging

from fastapi import FastAPI
from ray import serve
from ray.serve.handle import DeploymentHandle

from config import build_ray_api_deployment_config
from dto.glotlid import GlotLIDInput, GlotLIDOutput
from models.glotlid import GlotLIDModel

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(**build_ray_api_deployment_config("glotlid"))
@serve.ingress(api)
class GlotLIDApi:
    def __init__(self, glotlid_model_handle: DeploymentHandle) -> None:
        self.glotlid = glotlid_model_handle

    @api.post("/lid", response_model=GlotLIDOutput)
    async def language_identification(self, input: GlotLIDInput):
        predicted_langs = await self.glotlid.identify_language.remote(input)  # type: ignore
        return predicted_langs


app = GlotLIDApi.bind(
    glotlid_model_handle=GlotLIDModel.bind(),
)
