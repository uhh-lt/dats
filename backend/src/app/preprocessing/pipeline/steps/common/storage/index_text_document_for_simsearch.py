from app.core.ml.embedding_service import EmbeddingService
from app.core.vector.crud.sentence_embedding import crud_sentence_embedding
from app.core.vector.dto.sentence_embedding import SentenceObjectIdentifier
from app.core.vector.weaviate_service import WeaviateService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from loguru import logger

emb = EmbeddingService()
weaviate = WeaviateService()


def index_text_document_for_simsearch(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    sdoc_id = cargo.data["sdoc_id"]
    proj_id = pptd.project_id

    sentences = [sent.text for sent in pptd.sentences]
    if len(sentences) > 0:
        # embed the sentences
        embeddings = emb.encode_sentences(sentences=sentences).tolist()

        # store the embeddings
        logger.debug(
            f"Adding {len(embeddings)} sentences "
            f"from SDoc {sdoc_id} in project {proj_id} to index ..."
        )
        with weaviate.weaviate_session() as client:
            crud_sentence_embedding.add_embedding_batch(
                client=client,
                project_id=proj_id,
                ids=[
                    SentenceObjectIdentifier(sdoc_id=sdoc_id, sentence_id=i)
                    for i in range(len(sentences))
                ],
                embeddings=embeddings,
            )

    return cargo
