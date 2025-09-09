import logging

from fastapi import FastAPI
from ray import serve
from ray.serve.handle import DeploymentHandle

from config import build_ray_api_deployment_config
from dto.quote import QuoteJobInput, QuoteJobOutput
from models.quote import QuoteModel

api = FastAPI()

logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_api_deployment_config("quote"))
@serve.ingress(api)
class QuoteApi:
    def __init__(self, quote_model_handle: DeploymentHandle) -> None:
        self.quotect = quote_model_handle

    @api.post("/predict", response_model=QuoteJobOutput)
    async def predict(self, input: QuoteJobInput) -> QuoteJobOutput:
        predict_result = await self.quotect.predict.remote(input)  # type: ignore
        return predict_result


app = QuoteApi.bind(
    quote_model_handle=QuoteModel.bind(),
)
