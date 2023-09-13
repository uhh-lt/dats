import logging

import torch
from dto.dbert import DbertInput, DbertOutput
from ray import serve
from transformers.pipelines import pipeline

logger = logging.getLogger("ray.serve")


@serve.deployment(
    ray_actor_options={"num_gpus": 1},
    autoscaling_config={
        "min_replicas": 0,
        "max_replicas": 2,
    },
)
class DistilBertModel:
    def __init__(self):
        self.classifier = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased",
            framework="pt",
            # Transformers requires you to pass device with index
            device=torch.device("cuda:0"),
        )

    def classify(self, input: DbertInput) -> DbertOutput:
        return DbertOutput(**list(self.classifier(input.sentence))[0])
