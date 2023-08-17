from loguru import logger

from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.autospan import AutoSpan
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def generate_sentence_annotations(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    doc = pptd.spacy_doc
    if doc is None:
        logger.error(
            f"spaCy Doc is None for {pptd.filename}!"
            "Please run the spaCy pipeline first!"
        )
        return cargo

    pptd.sentences = list()
    for s in doc.sents:
        auto = AutoSpan(
            code="SENTENCE",
            start=s.start_char,
            end=s.end_char,
            text=s.text,
            start_token=s.start,
            end_token=s.end,
        )
        pptd.sentences.append(auto)

    return cargo
