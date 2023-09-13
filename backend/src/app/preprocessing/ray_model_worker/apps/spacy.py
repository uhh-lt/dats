import logging

from dto.spacy import SpacyInput, SpacyOutput
from fastapi import FastAPI
from models.spacy import SpacyModel
from ray import serve
from ray.serve.handle import RayServeHandle

api = FastAPI()

logger = logging.getLogger("ray.serve")


@serve.deployment(num_replicas=1, route_prefix="/spacy")
@serve.ingress(api)
class SpacyApi:
    def __init__(self, spacy_model_handle: RayServeHandle) -> None:
        self.spacy = spacy_model_handle

    @api.post("/ner", response_model=SpacyOutput)
    async def ner(self, input: SpacyInput) -> SpacyOutput:
        predict_ref = await self.spacy.ner.remote(input)
        predict_result = await predict_ref
        return predict_result


app = SpacyApi.bind(
    spacy_model_handle=SpacyModel.bind(),
)
