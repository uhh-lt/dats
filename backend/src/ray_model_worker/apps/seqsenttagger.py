import logging

from dto.seqsenttagger import SeqSentTaggerJobInput, SeqSentTaggerJobResponse
from fastapi import FastAPI
from models.seqsenttagger import SeqSentTaggerModel
from ray import serve
from ray.serve.handle import DeploymentHandle

logger = logging.getLogger("ray.serve")

api = FastAPI()


@serve.deployment(num_replicas=1, name="seqsenttagger", max_ongoing_requests=128)
@serve.ingress(api)
class SeqSentTaggerApi:
    def __init__(self, seqsenttagger_model_handle: DeploymentHandle) -> None:
        self.seq_sent_tagger = seqsenttagger_model_handle

    @api.post("/train_apply", response_model=SeqSentTaggerJobResponse)
    async def train_apply(self, input: SeqSentTaggerJobInput):
        return await self.seq_sent_tagger.train_apply.remote(input)  # type: ignore


app = SeqSentTaggerApi.bind(
    seqsenttagger_model_handle=SeqSentTaggerModel.bind(),
)
