from loguru import logger

from common.doc_type_enum import DocType
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc_processing.artefacts import SENTENCE_EMBEDDINGS, TOKENS_SENTENCES
from repos.db.sql_repo import SQLRepo
from repos.ray.dto.clip import ClipTextEmbeddingInput
from repos.ray.ray_repo import RayRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


class TextSentenceEmbeddingJobInput(SdocProcessingJobInput):
    sentences: list[str]


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> TextSentenceEmbeddingJobInput:
    with sqlr.transaction() as db:
        sdoc_data = crud_sdoc_data.read(
            db=db,
            id=payload.sdoc_id,
        )

        return TextSentenceEmbeddingJobInput(
            **payload.model_dump(),
            sentences=sdoc_data.sentences,
        )


@pipeline_step(
    requires={TOKENS_SENTENCES},
    produces={SENTENCE_EMBEDDINGS},
    doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
)
@register_job(
    job_type="text_sentence_embedding",
    input_type=TextSentenceEmbeddingJobInput,
    device="api",
    enricher=enrich_for_recompute,
)
def handle_text_sentence_embedding_job(
    payload: TextSentenceEmbeddingJobInput, job: Job
) -> None:
    if len(payload.sentences) > 0:
        # embed the sentences
        embeddings = (
            RayRepo()
            .clip_text_embedding(ClipTextEmbeddingInput(text=payload.sentences))
            .numpy()
            .tolist()
        )

        # store the embeddings
        logger.debug(
            f"Adding {len(embeddings)} sentences "
            f"from SDoc {payload.sdoc_id} in project {payload.project_id} to index ..."
        )
        crud_sentence_embedding.create_multi(
            client=WeaviateRepo().get_client(),
            project_id=payload.project_id,
            ids=[
                SentenceObjectIdentifier(sdoc_id=payload.sdoc_id, sentence_id=i)
                for i in range(len(payload.sentences))
            ],
            embeddings=embeddings,
        )
