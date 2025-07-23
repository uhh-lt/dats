from core.doc.image_embedding_crud import crud_image_embedding
from core.doc.image_embedding_dto import ImageObjectIdentifier
from loguru import logger
from modules.ml.embedding_service import EmbeddingService
from preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from repos.vector.weaviate_repo import WeaviateService

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
