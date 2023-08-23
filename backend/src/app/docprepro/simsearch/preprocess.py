from typing import Dict, List, Union

from app.celery.celery_worker import celery_worker
from app.docprepro.image.models.preproimagedoc import PreProImageDoc
from app.docprepro.simsearch.find_similar_images import find_similar_images_
from app.docprepro.simsearch.find_similar_sentences import (
    find_similar_sentences_,
    find_similar_sentences_with_embedding_with_threshold_,
)
from app.docprepro.simsearch.index_image_document_in_faiss import (
    index_image_document_in_faiss_,
)
from app.docprepro.simsearch.index_text_document_in_faiss import (
    index_text_document_in_faiss_,
)
from app.docprepro.text.models.preprotextdoc import PreProTextDoc


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def index_text_document_in_faiss(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    return index_text_document_in_faiss_(pptds)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def index_image_document_in_faiss(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
    return index_image_document_in_faiss_(ppids)


# TODO Flo: move search stuff to other file
@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def find_similar_images(
    proj_id: int, query: Union[str, int], top_k: int = 10
) -> Dict[int, float]:
    return find_similar_images_(proj_id, query, top_k)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def find_similar_sentences(
    proj_id: int, query: Union[str, int], top_k: int = 10
) -> Dict[int, float]:
    return find_similar_sentences_(proj_id, query, top_k)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def find_similar_sentences_with_embedding_with_threshold(
    proj_id: int, query_sentences: List[str], threshold: float
) -> Dict[int, float]:
    return find_similar_sentences_with_embedding_with_threshold_(
        proj_id, query_sentences, threshold
    )
