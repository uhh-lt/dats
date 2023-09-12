import logging

from fastapi import APIRouter
from ray import serve

router = APIRouter()

logger = logging.getLogger("ray.serve")

import spacy


@serve.deployment(num_replicas=1)
@serve.ingress(router)
class APIIngress:
    def __init__(self, spacy_model_handle) -> None:
        self.spacyRay = spacy_model_handle

    @router.get("/spacy")
    async def classify(self, sentence: str):
        predict_ref = await self.spacyR.spacer.remote(sentence)
        predict_result = await predict_ref
        return predict_result


@serve.deployment(
    ray_actor_options={"num_gpus": 1},
    autoscaling_config={"min_replicas": 0, "max_replicas": 2},
)
class Space:
    def __init__(self):
        self.model = "en_core_web_sm"

    def spacer(self, text: str):
        result = []
        nlp = spacy.load(self.model)
        for doc in nlp.pipe(
            text,
            disable=["tok2vec", "tagger", "parser", "attribute_ruler", "lemmatizer"],
        ):
            # Do something with the doc here
            result.append([(ent.text, ent.label_) for ent in doc.ents])
        logger.info(f"{result=}")
        return result
