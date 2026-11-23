from common.doc_type_enum import DocType
from common.languages_enum import Language
from core.artefacts.content.content_artefact import CONTENT
from core.artefacts.language.language_artefact import LANGUAGE
from core.artefacts.raw_html.raw_html_artefact import RAW_HTML
from core.doc_processing.doc_processing_exceptions import LanguageNotSupportedError
from repos.db.sql_repo import SQLRepo
from repos.ray.dto.glotlid import GlotLIDInput, GlotLIDOutput
from repos.ray.ray_repo import RayRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()
ray = RayRepo()


class TextLanguageDetectionJobInput(SdocProcessingJobInput):
    raw_html: str
    text: str
    doctype: DocType


class TextLanguageDetectionJobOutput(JobOutputBase):
    language: str
    text: str


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> TextLanguageDetectionJobInput:
    with sqlr.transaction() as db:
        sdoc_data = CONTENT.store.read(db=db, sdoc_id=payload.sdoc_id)

        return TextLanguageDetectionJobInput(
            **payload.model_dump(),
            raw_html=RAW_HTML.store.read(db=db, sdoc_id=payload.sdoc_id).raw_html,
            text=sdoc_data.content,
            doctype=DocType(sdoc_data.source_document.doctype),
        )


@pipeline_step(
    requires={CONTENT},
    produces={LANGUAGE},
    doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
)
@register_job(
    job_type="language_detection",
    input_type=TextLanguageDetectionJobInput,
    output_type=TextLanguageDetectionJobOutput,
    enricher=enrich_for_recompute,
)
def handle_language_detection_job(
    payload: TextLanguageDetectionJobInput, job: Job
) -> TextLanguageDetectionJobOutput:
    if payload.settings.language != Language.auto:
        lang = payload.settings.language.value
    else:
        glotlid_input = GlotLIDInput(text=payload.text)
        glotlid_output: GlotLIDOutput = ray.language_identification(glotlid_input)

        # map the GlodLID language code to the ISO 639-1 language code we support in our spaCy Pipeline
        # TODO: we should set this in a config file or so
        code_map = {
            "eng_Latn": "en",
            "deu_Latn": "de",
            "ita_Latn": "it",
        }

        lang = None
        # take the best/first supported language
        for det_lang in glotlid_output.detected_languages:
            lang = code_map.get(det_lang.lang_code, None)
            if lang is not None:
                break
        if lang is None:
            # none of the top k languages is supported
            raise LanguageNotSupportedError(
                detected_language=glotlid_output.best_match.lang_code
            )

    with sqlr.transaction() as db:
        # Store language in db
        LANGUAGE.store.write(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=payload.doctype,
            values={"language": lang},
        )
    return TextLanguageDetectionJobOutput(language=lang, text=payload.text)
