from common.artefact_enum import Artefact
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from core.doc.source_document_data_crud import crud_sdoc_data
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.doc_processing.pipeline.pipeline_step_decorator import pipeline_step
from modules.ml.embedding_service import EmbeddingService
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


class TextDocumentEmbeddingJobInput(SdocProcessingJobInput):
    text: str


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> TextDocumentEmbeddingJobInput:
    with sqlr.transaction() as db:
        sdoc_data = crud_sdoc_data.read(
            db=db,
            id=payload.sdoc_id,
        )

        return TextDocumentEmbeddingJobInput(
            **payload.model_dump(),
            text=sdoc_data.content,
        )


@pipeline_step(
    requires={Artefact.CONTENT},
    produces={Artefact.DOCUMENT_EMBEDDINGS},
    doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
)
@register_job(
    job_type=JobType.TEXT_DOCUMENT_EMBEDDING,
    input_type=TextDocumentEmbeddingJobInput,
    device="api",
    enricher=enrich_for_recompute,
)
def handle_text_document_embedding_job(
    payload: TextDocumentEmbeddingJobInput, job: Job
) -> None:
    EmbeddingService().embed_document(
        project_id=payload.project_id,
        sdoc_id=payload.sdoc_id,
        text=payload.text,
    )
