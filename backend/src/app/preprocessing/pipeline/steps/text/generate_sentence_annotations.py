from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.autospan import AutoSpan
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from loguru import logger


def generate_sentence_annotations(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    out = pptd.spacy_pipeline_output

    if out is None:
        logger.error(
            f"spaCy PipelineOutput is None for {pptd.filename}!"
            "Please run the spaCy pipeline first!"
        )
        return cargo

    pptd.sentences = list()
    for s in out.sents:
        auto = AutoSpan(
            code="SENTENCE",
            start=s.start_char,
            end=s.end_char,
            text=s.text,
            start_token=s.start_token,
            end_token=s.end_token,
        )
        pptd.sentences.append(auto)

    return cargo
