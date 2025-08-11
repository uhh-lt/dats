from common.doc_type import DocType
from common.job_type import JobType
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from ray_model_worker.dto.glotlid import GlotLIDInput, GlotLIDOutput
from repos.db.sql_repo import SQLRepo
from repos.ray_repo import RayRepo
from systems.job_system.job_dto import Job, JobOutputBase, SdocJobInput
from systems.job_system.job_register_decorator import register_job

ray = RayRepo()


class LanguageNotSupportedError(Exception):
    def __init__(self, detected_language: str) -> None:
        super().__init__(
            f"The detected language '{detected_language}' is not supported by DATS!"
        )


class DetectLanguageJobInput(SdocJobInput):
    html: str
    text: str
    doctype: DocType


class DetectLanguageJobOutput(JobOutputBase):
    language: str
    text: str


@register_job(
    job_type=JobType.DETECT_LANGUAGE,
    input_type=DetectLanguageJobInput,
    output_type=DetectLanguageJobOutput,
)
def handle_detect_language_job(
    payload: DetectLanguageJobInput, job: Job
) -> DetectLanguageJobOutput:
    # DETECT LANGUAGE
    # TODO Flo: what to do with mixed lang docs?
    glotlid_input = GlotLIDInput(text=payload.text)
    glotlid_output: GlotLIDOutput = ray.language_identification(glotlid_input)

    # map the GlodLID language code to the ISO 639-1 language code we support in our spaCy Pipeline
    # TODO: we should set this in a config file or so
    code_map = {
        "eng_Latn": "en",
        "deu_Latn": "de",
        "ita_Latn": "it",
    }

    lang_code = glotlid_output.best_match.lang_code
    lang = code_map.get(lang_code, None)
    if lang is None:
        raise LanguageNotSupportedError(detected_language=lang_code)

    with SQLRepo().db_session() as db:
        # Store language in db
        crud_sdoc_meta.create_multi_with_doctype(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=payload.doctype,
            keys=["language"],
            values=[lang],
        )
    return DetectLanguageJobOutput(language=lang, text=payload.text)
