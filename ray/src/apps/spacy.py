import logging

from fastapi import FastAPI
from ray import serve
from ray.serve.handle import DeploymentHandle

from dto.spacy import SpacyInput, SpacyPipelineOutput
from models.spacy import SpacyModel

api = FastAPI()

logger = logging.getLogger("ray.serve")


@serve.deployment(num_replicas=1, name="spacy", max_ongoing_requests=128)
@serve.ingress(api)
class SpacyApi:
    def __init__(self, spacy_model_handle: DeploymentHandle) -> None:
        self.spacy = spacy_model_handle

    @api.post("/pipeline", response_model=SpacyPipelineOutput)
    async def pipeline(self, input: SpacyInput) -> SpacyPipelineOutput:
        predict_result = await self.spacy.pipeline.remote(input)  # type: ignore
        return predict_result


app = SpacyApi.bind(
    spacy_model_handle=SpacyModel.bind(),
)
