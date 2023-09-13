import logging

import spacy
from dto.spacy import SpacyInput, SpacyOutput
from ray import serve

logger = logging.getLogger("ray.serve")


@serve.deployment(
    ray_actor_options={"num_gpus": 1},
    autoscaling_config={
        "min_replicas": 0,
        "max_replicas": 2,
    },
)
class SpacyModel:
    def __init__(self):
        self.model = "en_core_web_trf"

    def ner(self, input: SpacyInput) -> SpacyOutput:
        nes = []
        nlp = spacy.load(self.model)
        doc = nlp(input.text)
        for ent in doc.ents:
            nes.append((ent.text, ent.label_))
        return SpacyOutput(text=input.text, nes=nes)
