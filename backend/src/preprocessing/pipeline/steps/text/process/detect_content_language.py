from loguru import logger
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from ray_model_worker.dto.glotlid import GlotLIDInput, GlotLIDOutput
from repos.ray_repo import RayModelService

rms = RayModelService()


def detect_content_language(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    if "language" not in pptd.metadata:
        try:
            # TODO Flo: what to do with mixed lang docs?
            glotlid_input = GlotLIDInput(text=pptd.text)
            glotlid_output: GlotLIDOutput = rms.language_identification(glotlid_input)

            # map the GlodLID language code to the ISO 639-1 language code we support in our spaCy Pipeline
            # TODO: we should set this in a config file or so
            code_map = {
                "eng_Latn": "en",
                "deu_Latn": "de",
                "ita_Latn": "it",
            }

            lang_code = glotlid_output.best_match.lang_code
            lang_code = code_map.get(lang_code, None)
            if lang_code is None:
                logger.warning(
                    f"Unsupported language of {pptd.filename}: {glotlid_output.best_match}"
                )
                lang_code = "en"

            pptd.metadata["language"] = lang_code
        except Exception as e:
            logger.warning(f"Cannot detect language of {pptd.filename}! {e}")
            pptd.metadata["language"] = "en"

    return cargo
