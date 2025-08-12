import logging

from dto.coref import CorefJobInput, CorefJobOutput
from fastapi import FastAPI
from models.coref import CorefModel
from ray import serve
from ray.serve.handle import DeploymentHandle

api = FastAPI()

logger = logging.getLogger("ray.serve")


@serve.deployment(num_replicas=1, name="coref", max_ongoing_requests=128)
@serve.ingress(api)
class CorefApi:
    def __init__(self, coref_model_handle: DeploymentHandle) -> None:
        self.coref = coref_model_handle

    @api.post("/predict", response_model=CorefJobOutput)
    async def predict(self, input: CorefJobInput) -> CorefJobOutput:
        predict_result = await self.coref.predict.remote(input)  # type: ignore
        return predict_result


app = CorefApi.bind(
    coref_model_handle=CorefModel.bind(),
)
