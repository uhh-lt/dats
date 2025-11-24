from loguru import logger

from common.job_type import JobType
from core.doc.image_embedding_crud import crud_image_embedding
from core.doc.image_embedding_dto import ImageObjectIdentifier
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.ml.embedding_service import EmbeddingService
from repos.db.sql_repo import SQLRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

emb = EmbeddingService()
weaviate = WeaviateRepo()
sqlr = SQLRepo()


class ImageEmbeddingJobInput(SdocProcessingJobInput):
    pass


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> ImageEmbeddingJobInput:
    return ImageEmbeddingJobInput(
        **payload.model_dump(),
    )


@register_job(
    job_type=JobType.IMAGE_EMBEDDING,
    input_type=ImageEmbeddingJobInput,
    device="api",
    enricher=enrich_for_recompute,
)
def handle_image_embedding_job(payload: ImageEmbeddingJobInput, job: Job) -> None:
    # embed the image
    embedding = emb.encode_image(sdoc_id=payload.sdoc_id).tolist()

    # store the embeddings
    logger.debug(
        f"Adding image SDoc {payload.sdoc_id} in Project {payload.project_id} to Weaviate ..."
    )
    with weaviate.weaviate_session() as client:
        crud_image_embedding.add_embedding(
            client=client,
            project_id=payload.project_id,
            id=ImageObjectIdentifier(sdoc_id=payload.sdoc_id),
            embedding=embedding,
        )
