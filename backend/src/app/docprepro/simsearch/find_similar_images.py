from typing import Union

from app.core.search.faiss_index_service import FaissIndexService
from app.core.search.index_type import IndexType
from app.docprepro.simsearch.util import encode_query


def find_similar_images_(proj_id: int, query: Union[str, int], top_k: int):
    encoded_query = encode_query(query=query)
    sdoc_ids_with_dists = FaissIndexService().search_index(proj_id=proj_id,
                                                           index_type=IndexType.IMAGE,
                                                           query=encoded_query,
                                                           top_k=top_k)
    return sdoc_ids_with_dists
