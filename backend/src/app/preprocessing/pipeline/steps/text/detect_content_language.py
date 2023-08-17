from langdetect import detect_langs
from loguru import logger

from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


def detect_content_language(cargo: PipelineCargo) -> PipelineCargo:
    pptd = cargo.data["pptd"]
    try:
        # TODO Flo: what to do with mixed lang docs?
        pptd.metadata["language"] = detect_langs(pptd.text)[0].lang
    except Exception as e:
        logger.warning(f"Cannot detect language of {pptd.sdoc_id}! {e}")
        pptd.metadata["language"] = "en"

    return cargo
