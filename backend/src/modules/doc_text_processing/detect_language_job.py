from common.doc_type import DocType
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from ray_model_worker.dto.glotlid import GlotLIDInput, GlotLIDOutput
from repos.db.sql_repo import SQLRepo
from repos.ray_repo import RayRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobPriority,
)
from systems.job_system.job_register_decorator import register_job

ray = RayRepo()


class LanguageNotSupportedError(Exception):
    def __init__(self, detected_language: str) -> None:
        super().__init__(
            f"The detected language '{detected_language}' is not supported by DATS!"
        )


class DetectLanguageJobInput(JobInputBase):
    sdoc_id: int
    text: str | None
    doctype: DocType | None


@register_job(
    job_type="detect_language",
    input_type=DetectLanguageJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def handle_detect_language_job(payload: DetectLanguageJobInput, job: Job) -> None:
    # if we re-run this job, text is None or doctype is None, we need to query it from db
    with SQLRepo().db_session() as db:
        if payload.text is None or payload.doctype is None:
            sdoc_data = crud_sdoc_data.read(db=db, id=payload.sdoc_id)
            payload.text = sdoc_data.content
            payload.doctype = DocType(sdoc_data.source_document.doctype)

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

        # Store language in db
        crud_sdoc_meta.create_multi_with_doctype(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=payload.doctype,
            keys=["language"],
            values=[lang],
        )

        # Set db status
        crud_sdoc_status.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentStatusUpdate(lang_detect=True),
        )
