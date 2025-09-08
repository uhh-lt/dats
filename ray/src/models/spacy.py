import logging

import spacy
from ray import serve
from spacy.language import Language

from config import build_ray_model_deployment_config, conf
from dto.spacy import SpacyInput, SpacyPipelineOutput, SpacySpan, SpacyToken

cc = conf.spacy

DEVICE = cc.device
MODEL_DIR = cc.model_dir
MODELS = cc.models
MAX_TEXT_LENGTH = cc.max_text_length


logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("spacy"))
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
                spacy.require_gpu(gpu_id=device_id)  # type: ignore

        nlp: dict[str, Language] = dict()

        for lang, model in MODELS.items():
            if lang == "default":
                continue
            logger.info(f"Loading spaCy Model '{model}' ...")
            nlp[lang] = spacy.load(f"{MODEL_DIR}/{model}")

        logger.debug("Loading spaCy Models... Done!")

        nlp["default"] = nlp[MODELS.default]

        for lang in nlp.values():
            lang.max_length = MAX_TEXT_LENGTH

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
        tokens: list[SpacyToken] = [
            SpacyToken(
                text=token.text,
                start_char=token.idx,
                end_char=token.idx + len(token.text),
                pos=token.pos_,
                lemma=token.lemma_,
                is_stopword=token.is_stop,
                is_punctuation=token.is_punct,
                is_alpha=token.is_alpha,
                is_digit=token.is_digit,
            )
            for token in doc
        ]

        ents: list[SpacySpan] = [
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

        sents: list[SpacySpan] = [
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
