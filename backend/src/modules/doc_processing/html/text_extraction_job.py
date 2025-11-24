from common.doc_type import DocType
from common.job_type import JobType
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.doc_processing.html.html_mapping_utils import HTMLTextMapper
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


class TextExtractionJobInput(SdocProcessingJobInput):
    raw_html: str
    filename: str
    doctype: DocType


class TextExtractionJobOutput(JobOutputBase):
    text: str


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> TextExtractionJobInput:
    with sqlr.db_session() as db:
        sdoc_data = crud_sdoc_data.read(
            db=db,
            id=payload.sdoc_id,
        )

        return TextExtractionJobInput(
            **payload.model_dump(),
            raw_html=sdoc_data.raw_html,
            filename=sdoc_data.source_document.filename,
            doctype=DocType(sdoc_data.source_document.doctype),
        )


@register_job(
    job_type=JobType.TEXT_EXTRACTION,
    input_type=TextExtractionJobInput,
    output_type=TextExtractionJobOutput,
    enricher=enrich_for_recompute,
)
def handle_text_extraction_job(
    payload: TextExtractionJobInput,
    job: Job,
) -> TextExtractionJobOutput:
    parser = HTMLTextMapper()
    results = parser(payload.raw_html)
    text = " ".join([str(r["text"]) for r in results])

    # Store text in sdoc data
    with sqlr.db_session() as db:
        crud_sdoc_data.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentDataUpdate(
                content=text,
            ),
        )

    return TextExtractionJobOutput(text=text)
