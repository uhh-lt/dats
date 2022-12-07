from app.core.search.faiss_index_service import FaissIndexService
from app.core.search.index_type import IndexType
from app.docprepro.simsearch.index_text_document_in_faiss import text_encoder


def find_similar_sentences_(proj_id: int, query: str, top_k: int):
    assert isinstance(query, str), "Query is not a string!"
    encoded_query = text_encoder.encode(sentences=query,
                                        batch_size=1,
                                        show_progress_bar=False,
                                        normalize_embeddings=True,
                                        device="cpu")
    embedding_ids_with_dists = FaissIndexService().search_index(proj_id=proj_id,
                                                                index_type=IndexType.TEXT,
                                                                query=encoded_query,
                                                                top_k=top_k)
    return embedding_ids_with_dists
