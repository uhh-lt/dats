from loguru import logger

from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.autospan import AutoSpan
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def generate_named_entity_annotations(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    doc = pptd.spacy_doc
    if doc is None:
        logger.error(
            f"spaCy Doc is None for {pptd.filename}!"
            "Please run the spaCy pipeline first!"
        )
        return cargo

    # create AutoSpans for NER
    for ne in doc.ents:
        auto = AutoSpan(
            code=f"{ne.label_}",
            start=ne.start_char,
            end=ne.end_char,
            text=ne.text,
            start_token=ne.start,
            end_token=ne.end,
        )
        if auto.code not in pptd.spans:
            pptd.spans[auto.code] = list()
        pptd.spans[auto.code].append(auto)

    return cargo
