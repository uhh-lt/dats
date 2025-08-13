from common.job_type import JobType
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from core.doc.source_document_data_crud import crud_sdoc_data
from loguru import logger
from modules.ml.embedding_service import EmbeddingService
from repos.db.sql_repo import SQLRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.job_system.job_dto import Job, SdocJobInput
from systems.job_system.job_register_decorator import register_job


class TextSentenceEmbeddingJobInput(SdocJobInput):
    sdoc_id: int
    sentences: list[str] | None


@register_job(
    job_type=JobType.TEXT_SENTENCE_EMBEDDING,
    input_type=TextSentenceEmbeddingJobInput,
    device="gpu",
)
def handle_text_sentence_embedding_job(
    payload: TextSentenceEmbeddingJobInput, job: Job
) -> None:
    # if we re-run this job, sentences is None, we need to query it from db
    if payload.sentences is None:
        with SQLRepo().db_session() as db:
            sdoc_data = crud_sdoc_data.read(db=db, id=payload.sdoc_id)
            payload.sentences = sdoc_data.sentences

    if len(payload.sentences) > 0:
        # embed the sentences
        embeddings = (
            EmbeddingService().encode_sentences(sentences=payload.sentences).tolist()
        )

        # store the embeddings
        logger.debug(
            f"Adding {len(embeddings)} sentences "
            f"from SDoc {payload.sdoc_id} in project {payload.project_id} to index ..."
        )
        with WeaviateRepo().weaviate_session() as client:
            crud_sentence_embedding.add_embedding_batch(
                client=client,
                project_id=payload.project_id,
                ids=[
                    SentenceObjectIdentifier(sdoc_id=payload.sdoc_id, sentence_id=i)
                    for i in range(len(payload.sentences))
                ],
                embeddings=embeddings,
            )
