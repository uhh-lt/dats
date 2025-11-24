from common.doc_type import DocType
from common.job_type import JobType
from common.languages_enum import Language
from core.doc.source_document_data_crud import crud_sdoc_data
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from repos.db.sql_repo import SQLRepo
from repos.ray.dto.glotlid import GlotLIDInput, GlotLIDOutput
from repos.ray.ray_repo import RayRepo
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()
ray = RayRepo()


class LanguageNotSupportedError(Exception):
    def __init__(self, detected_language: str) -> None:
        super().__init__(
            f"The detected language '{detected_language}' is not supported by DATS!"
        )


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
    with sqlr.db_session() as db:
        sdoc_data = crud_sdoc_data.read(
            db=db,
            id=payload.sdoc_id,
        )

        return TextLanguageDetectionJobInput(
            **payload.model_dump(),
            raw_html=sdoc_data.raw_html,
            text=sdoc_data.content,
            doctype=DocType(sdoc_data.source_document.doctype),
        )


@register_job(
    job_type=JobType.TEXT_LANGUAGE_DETECTION,
    input_type=TextLanguageDetectionJobInput,
    output_type=TextLanguageDetectionJobOutput,
    enricher=enrich_for_recompute,
)
def handle_text_language_detection_job(
    payload: TextLanguageDetectionJobInput, job: Job
) -> TextLanguageDetectionJobOutput:
    if payload.settings.language != Language.auto:
        lang = payload.settings.language
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

    with sqlr.db_session() as db:
        # Store language in db
        crud_sdoc_meta.update_multi_with_doctype(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=payload.doctype,
            keys=["language"],
            values=[lang],
        )
    return TextLanguageDetectionJobOutput(language=lang, text=payload.text)
