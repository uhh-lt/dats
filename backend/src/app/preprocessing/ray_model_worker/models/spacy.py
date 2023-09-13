import logging
from typing import Dict, List

import spacy
from config import conf
from dto.spacy import SpacyInput, SpacyPipelineOutput, SpacySpan, SpacyToken
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

    def _get_language_specific_model(self, language: str) -> Language:
        return (
            self.spacy_models[language]
            if language in self.spacy_models
            else self.spacy_models["default"]
        )

    def pipeline(self, input: SpacyInput) -> SpacyPipelineOutput:
        model = self._get_language_specific_model(input.language)
        doc = model(input.text)
        tokens: List[SpacyToken] = [
            SpacyToken(
                text=token.text,
                start_char=token.idx,
                end_char=token.idx + len(token.text),
                label=token.ent_type_,
                pos=token.pos_,
                lemma=token.lemma_,
                stopword=token.is_stop,
                punctuation=token.is_punct,
                alpha=token.is_alpha,
                digit=token.is_digit,
            )
            for token in doc
        ]

        ents: List[SpacySpan] = [
            SpacySpan(
                text=ent.text,
                start_char=ent.start_char,
                end_char=ent.end_char,
                start_token=ent.start,
                end_token=ent.end,
                label=ent.label_,
            )
            for ent in doc.ents
        ]

        sents: List[SpacySpan] = [
            SpacySpan(
                text=sent.text,
                start_char=sent.start_char,
                end_char=sent.end_char,
                start_token=sent.start,
                end_token=sent.end,
                label="SENTENCE",
            )
            for sent in doc.sents
        ]

        return SpacyPipelineOutput(tokens=tokens, ents=ents, sents=sents)
