from loguru import logger
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from preprocessing.pipeline.model.text.sentence import Sentence


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
        sent = Sentence(
            start=s.start_char,
            end=s.end_char,
            text=s.text,
        )
        pptd.sentences.append(sent)

    return cargo
