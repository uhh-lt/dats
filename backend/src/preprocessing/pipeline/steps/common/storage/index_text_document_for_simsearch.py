from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from loguru import logger
from modules.ml.embedding_service import EmbeddingService
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from repos.vector.weaviate_repo import WeaviateService

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
