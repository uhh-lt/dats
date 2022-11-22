from typing import List, Union, Dict

import numpy as np
from PIL import Image

from app.core.search.faiss_index_service import FaissIndexService
from app.core.search.index_type import IndexType
from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.image.models.preproimagedoc import PreProImageDoc
from app.docprepro.simsearch.index_image_document_in_faiss import index_image_document_in_faiss_, image_encoder
from app.docprepro.simsearch.index_text_document_in_faiss import index_text_document_in_faiss_, text_encoder
from app.docprepro.text.models.preprotextdoc import PreProTextDoc

faisss = FaissIndexService()


@celery_worker.task(acks_late=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 5, 'countdown': 5})
def index_text_document_in_faiss(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    return index_text_document_in_faiss_(pptds)


@celery_worker.task(acks_late=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 5, 'countdown': 5})
def index_image_document_in_faiss(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
    return index_image_document_in_faiss_(ppids)


# TODO Flo: move search stuff to other file
@celery_worker.task(acks_late=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 5, 'countdown': 5})
def find_similar_images(proj_id: int, query: Union[str, Image.Image], top_k: int = 10) -> Dict[int, float]:
    encoded_query = _encode_query(query=query)
    sdoc_ids_with_dists = faisss.search_index(proj_id=proj_id,
                                              index_type=IndexType.IMAGE,
                                              query=encoded_query,
                                              top_k=top_k)
    return sdoc_ids_with_dists


@celery_worker.task(acks_late=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 5, 'countdown': 5})
def find_similar_sentences(proj_id: int, query: Union[str, Image.Image], top_k: int = 10) -> Dict[int, float]:
    encoded_query = _encode_query(query=query)
    span_anno_ids_with_dists = faisss.search_index(proj_id=proj_id,
                                                   index_type=IndexType.TEXT,
                                                   query=encoded_query,
                                                   top_k=top_k)
    return span_anno_ids_with_dists


def _encode_query(query: Union[str, Image.Image]) -> np.ndarray:
    if isinstance(query, str):
        encoded_query = text_encoder.encode(sentences=query,
                                            batch_size=1,
                                            show_progress_bar=False,
                                            normalize_embeddings=True,
                                            device="cpu")

    elif isinstance(query, Image.Image):
        # noinspection PyTypeChecker
        encoded_query = image_encoder.encode(sentences=query,
                                             batch_size=1,
                                             show_progress_bar=False,
                                             normalize_embeddings=True,
                                             device="cpu")
    else:
        raise NotImplementedError("Only Strings or Images are supported as Query!")

    return encoded_query
