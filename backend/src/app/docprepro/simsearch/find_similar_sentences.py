from typing import List

from app.core.search.faiss_index_service import FaissIndexService
from app.core.search.index_type import IndexType
from app.docprepro.simsearch.util import encode_query, encode_text_queries


def find_similar_sentences_(proj_id: int, query: str, top_k: int):
    encoded_query = encode_query(query=query)
    embedding_ids_with_dists = FaissIndexService().search_index(
        proj_id=proj_id, index_type=IndexType.TEXT, query=encoded_query, top_k=top_k
    )
    return embedding_ids_with_dists


def find_similar_sentences_with_embedding_with_threshold_(
    proj_id: int, query_sentences: List[str], threshold: float
):
    # encode queries
    encoded_averaged_query = encode_text_queries(queries=query_sentences)
    embedding_ids_with_dists = FaissIndexService().search_index_with_threshold(
        proj_id=proj_id,
        index_type=IndexType.TEXT,
        query=encoded_averaged_query,
        threshold=threshold,
    )
    return embedding_ids_with_dists
