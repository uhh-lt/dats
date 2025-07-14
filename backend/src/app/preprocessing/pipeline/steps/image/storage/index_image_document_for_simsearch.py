from app.core.ml.embedding_service import EmbeddingService
from app.core.vector.crud.image_embedding import crud_image_embedding
from app.core.vector.dto.image_embedding import ImageObjectIdentifier
from app.core.vector.weaviate_service import WeaviateService
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from loguru import logger

emb = EmbeddingService()
weaviate = WeaviateService()


def index_image_document_for_simsearch(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]
    sdoc_id = cargo.data["sdoc_id"]
    proj_id = ppid.project_id

    # embed the image
    embedding = emb.encode_image(sdoc_id=sdoc_id).tolist()

    # store the embeddings
    logger.debug(f"Adding image SDoc {sdoc_id} in Project {proj_id} to Weaviate ...")
    with weaviate.weaviate_session() as client:
        crud_image_embedding.add_embedding(
            client=client,
            project_id=proj_id,
            id=ImageObjectIdentifier(sdoc_id=sdoc_id),
            embedding=embedding,
        )

    return cargo
