from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.autospan import AutoSpan
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from loguru import logger


def generate_named_entity_annotations(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    out = pptd.spacy_pipeline_output
    if out is None:
        logger.error(
            f"spaCy PipelineOutput is None for {pptd.filename}!"
            "Please run the spaCy pipeline first!"
        )
        return cargo

    # create AutoSpans for NER
    for ne in out.ents:
        auto = AutoSpan(
            code=f"{ne.label}",
            start=ne.start_char,
            end=ne.end_char,
            text=ne.text,
            start_token=ne.start_token,
            end_token=ne.end_token,
        )
        if auto.code not in pptd.spans:
            pptd.spans[auto.code] = list()
        pptd.spans[auto.code].append(auto)

    return cargo
