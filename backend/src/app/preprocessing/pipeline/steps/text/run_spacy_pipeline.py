from functools import lru_cache
from typing import Dict

import spacy
from loguru import logger
from spacy import Language
from spacy.tokens import Doc

from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from config import conf


@lru_cache(maxsize=1)
def __load_spacy_models() -> Dict[str, Language]:
    logger.debug("Loading spaCy Models...")

    if str(conf.docprepro.text.spacy.device).startswith("cuda"):
        spacy.prefer_gpu()

    nlp: Dict[str, Language] = dict()

    for lang, model in conf.docprepro.text.spacy.models.items():
        if lang == "default":
            continue
        logger.info(f"Loading spaCy Model '{model}' ...")
        nlp[lang] = spacy.load(model)

    logger.debug("Loading spaCy Models... Done!")

    nlp["default"] = nlp[conf.docprepro.text.spacy.models.default]

    for lang in nlp.values():
        lang.max_length = conf.docprepro.text.spacy.max_text_length

    return nlp


def run_spacy_pipeline(cargo: PipelineCargo) -> PipelineCargo:
    spacy_models = __load_spacy_models()

    pptd: PreProTextDoc = cargo.data["pptd"]
    logger.info(f"Running spaCy Pipeline for {pptd.filepath}...")
    # Flo: use the language specific model for each pptd
    model = (
        spacy_models[pptd.metadata["language"]]
        if pptd.metadata["language"] in spacy_models
        else spacy_models["default"]
    )
    doc: Doc = model(pptd.text)
    pptd.spacy_doc = doc

    return cargo
