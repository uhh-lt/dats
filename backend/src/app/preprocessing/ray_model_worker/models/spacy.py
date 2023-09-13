import logging
from typing import Dict

import spacy
from config import conf
from dto.spacy import SpacyInput, SpacyOutput
from ray import serve
from spacy import Language

DEVICE = conf.spacy.device


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
        logger.debug("Loading spaCy Models...")

        if str(DEVICE).startswith("cuda"):
            import torch

            if torch.cuda.is_available():
                device_id = (
                    int(str(DEVICE).split(":")[1])
                    if len(DEVICE) > 4 and ":" in DEVICE
                    else 0
                )
                spacy.require_gpu(gpu_id=device_id)
            spacy.prefer_gpu()

        nlp: Dict[str, Language] = dict()

        for lang, model in conf.spacy.models.items():
            if lang == "default":
                continue
            logger.info(f"Loading spaCy Model '{model}' ...")
            nlp[lang] = spacy.load(model)

        logger.debug("Loading spaCy Models... Done!")

        nlp["default"] = nlp[conf.spacy.models.default]

        for lang in nlp.values():
            lang.max_length = conf.spacy.max_text_length

        self.spacy_models = nlp

    def ner(self, input: SpacyInput) -> SpacyOutput:
        model = (
            self.spacy_models[input.language]
            if input.language in self.spacy_models
            else self.spacy_models["default"]
        )

        nes = []
        doc = model(input.text)
        for ent in doc.ents:
            nes.append((ent.text, ent.label_))

        return SpacyOutput(
            text=input.text,
            nes=nes,
        )
