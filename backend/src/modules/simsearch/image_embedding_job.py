from loguru import logger

from common.doc_type_enum import DocType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from modules.simsearch.image_embedding_artefact import IMAGE_EMBEDDINGS
from modules.simsearch.image_embedding_crud import crud_image_embedding
from modules.simsearch.image_embedding_dto import ImageObjectIdentifier
from modules.simsearch.image_embedding_utils import encode_image
from repos.db.sql_repo import SQLRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

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


@pipeline_step(
    requires=set(),
    produces={IMAGE_EMBEDDINGS},
    doctypes={DocType.image},
)
@register_job(
    job_type="image_embedding",
    input_type=ImageEmbeddingJobInput,
    device="api",
    enricher=enrich_for_recompute,
)
def handle_image_embedding_job(payload: ImageEmbeddingJobInput, job: Job) -> None:
    with SQLRepo().transaction() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )

    embedding = encode_image(sdoc).tolist()

    # store the embeddings
    logger.debug(
        f"Adding image SDoc {payload.sdoc_id} in Project {payload.project_id} to Weaviate ..."
    )
    crud_image_embedding.create(
        client=weaviate.get_client(),
        project_id=payload.project_id,
        id=ImageObjectIdentifier(sdoc_id=payload.sdoc_id),
        embedding=embedding,
    )
