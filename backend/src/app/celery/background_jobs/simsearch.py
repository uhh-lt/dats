from pathlib import Path
from typing import Dict, List, Union

import numpy as np
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import DocType
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.core.search.index_type import IndexType
from app.core.search.simsearch_service import SimSearchService
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.clip import (
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)

rms = RayModelService()
repo = RepoService()
sqls = SQLService()
sss = SimSearchService()


def _get_image_path_with_sdoc_id(sdoc_id: int) -> Path:
    with sqls.db_session() as db:
        sdoc = SourceDocumentRead.from_orm(crud_sdoc.read(db=db, id=sdoc_id))
        assert (
            sdoc.doctype == DocType.image
        ), f"SourceDocument with {sdoc_id=} is not an image!"

    return repo.get_path_to_sdoc_file(sdoc=sdoc, raise_if_not_exists=True)


def _encode_query(query: Union[str, int]) -> np.ndarray:
    if isinstance(query, str) and query.isdigit():
        query = int(query)

    if isinstance(query, str):
        encoded_query = rms.clip_text_embedding(ClipTextEmbeddingInput(text=[query]))
    elif isinstance(query, int):
        query_image_path = _get_image_path_with_sdoc_id(sdoc_id=query)
        encoded_query = rms.clip_image_embedding(
            ClipImageEmbeddingInput(image_fps=[str(query_image_path)])
        )
    else:
        raise NotImplementedError("Only Strings or Images are supported as Query!")

    return encoded_query.numpy().squeeze()


def find_similar_images_(
    proj_id: int, query: Union[str, int], top_k: int
) -> Dict[int, float]:
    encoded_query = _encode_query(query=query)
    sdoc_ids_with_dists = sss.search_index(
        proj_id=proj_id,
        index_type=IndexType.IMAGE,
        query_emb=encoded_query,
        top_k=top_k,
    )
    return sdoc_ids_with_dists


def find_similar_sentences_(proj_id: int, query: str, top_k: int) -> Dict[int, float]:
    encoded_query = _encode_query(query=query)
    embedding_ids_with_dists = sss.search_index(
        proj_id=proj_id, index_type=IndexType.TEXT, query_emb=encoded_query, top_k=top_k
    )
    return embedding_ids_with_dists


def find_similar_sentences_with_embedding_with_threshold_(
    proj_id: int, query_sentences: List[str], threshold: float
) -> Dict[int, float]:
    # encode queries
    encoded_queries = rms.clip_text_embedding(
        ClipTextEmbeddingInput(text=query_sentences)
    )

    # average embeddings
    query_embedding: np.ndarray = encoded_queries.numpy().mean(axis=0)

    # normalize averaged embedding
    query_embedding: np.ndarray = query_embedding / np.linalg.norm(query_embedding)

    embedding_ids_with_dists = sss.search_index(
        proj_id=proj_id,
        index_type=IndexType.TEXT,
        query_emb=query_embedding,
        threshold=threshold,
    )
    return embedding_ids_with_dists
