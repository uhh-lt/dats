import logging

from fastapi import FastAPI
from ray import serve
from ray.serve.handle import DeploymentHandle

from dto.promptembedder import PromptEmbedderInput, PromptEmbedderOutput
from models.promptembedder import PromptEmbedderModel

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(num_replicas=1, name="promptembedder", max_ongoing_requests=128)
@serve.ingress(api)
class PromptEmbedderApi:
    def __init__(self, promptembedder_model_handle: DeploymentHandle) -> None:
        self.prompt_embedder = promptembedder_model_handle

    @api.post("/embed", response_model=PromptEmbedderOutput)
    async def embed(self, input: PromptEmbedderInput):
        return await self.prompt_embedder.embed.remote(input)  # type: ignore


app = PromptEmbedderApi.bind(
    promptembedder_model_handle=PromptEmbedderModel.bind(),
)
