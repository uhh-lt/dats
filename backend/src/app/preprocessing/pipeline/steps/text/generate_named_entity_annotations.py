from loguru import logger

from app.core.data.crud.user import SYSTEM_USER_ID
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.autospan import AutoSpan
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


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
        # FIXME Flo: hacky solution for German NER model, which only contains ('LOC', 'MISC', 'ORG', 'PER')
        code_name = f"{ne.label}"
        if code_name == "PER":
            code_name = "PERSON"

        auto = AutoSpan(
            code=code_name,
            start=ne.start_char,
            end=ne.end_char,
            text=ne.text,
            start_token=ne.start_token,
            end_token=ne.end_token,
            user_id=SYSTEM_USER_ID,
        )
        if auto.code not in pptd.spans:
            pptd.spans[auto.code] = set()
        pptd.spans[auto.code].add(auto)

    return cargo
