from common.doc_type_enum import DocType
from core.artefacts.content.content_artefact import CONTENT
from modules.tag_recommendation.document_embedding_artefact import DOCUMENT_EMBEDDINGS
from modules.tag_recommendation.document_embedding_dto import DocumentObjectIdentifier
from repos.db.sql_repo import SQLRepo
from repos.llm_repo import LLMRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


class TextDocumentEmbeddingJobInput(SdocProcessingJobInput):
    text: str


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> TextDocumentEmbeddingJobInput:
    with sqlr.transaction() as db:
        sdoc_data = CONTENT.store.read(db=db, sdoc_id=payload.sdoc_id)

        return TextDocumentEmbeddingJobInput(
            **payload.model_dump(),
            text=sdoc_data.content,
        )


@pipeline_step(
    requires={CONTENT},
    produces={DOCUMENT_EMBEDDINGS},
    doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
)
@register_job(
    job_type="document_embedding",
    input_type=TextDocumentEmbeddingJobInput,
    device="api",
    enricher=enrich_for_recompute,
)
def handle_document_embedding_job(
    payload: TextDocumentEmbeddingJobInput, job: Job
) -> None:
    # embed the text and replace the document's previous embedding
    embedding = LLMRepo().llm_embed([payload.text]).tolist()[0]
    DOCUMENT_EMBEDDINGS.store.create_multi(
        client=WeaviateRepo().get_client(),
        project_id=payload.project_id,
        ids=[DocumentObjectIdentifier(sdoc_id=payload.sdoc_id)],
        embeddings=[embedding],
    )
