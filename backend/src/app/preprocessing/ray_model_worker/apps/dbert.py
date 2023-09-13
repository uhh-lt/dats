import logging

from dto.dbert import DbertInput, DbertOutput
from fastapi import FastAPI
from models.dbert import DistilBertModel
from ray import serve
from ray.serve.handle import RayServeHandle

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(
    num_replicas=1,
    route_prefix="/dbert",
)
@serve.ingress(api)
class DbertApi:
    def __init__(self, dbert_model_handle: RayServeHandle) -> None:
        self.dbert = dbert_model_handle

    @api.post("/classify", response_model=DbertOutput)
    async def classify(self, dbert_input: DbertInput):
        predict_ref = await self.dbert.classify.remote(dbert_input.sentence)
        predict_result = await predict_ref
        return predict_result


app = DbertApi.bind(
    dbert_model_handle=DistilBertModel.bind(),
)
