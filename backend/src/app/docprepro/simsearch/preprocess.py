from typing import List, Union, Dict

import numpy as np
import torch
from PIL import Image
from loguru import logger
from sentence_transformers import SentenceTransformer

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.source_document import SDocStatus
from app.core.db.sql_service import SQLService
from app.core.search.faiss_index_service import FaissIndexService
from app.core.search.index_type import IndexType
from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.image.preproimagedoc import PreProImageDoc
from app.docprepro.text.preprotextdoc import PreProTextDoc
from config import conf

# Flo: This is important! Otherwise, it will not work with celery thread management and just hang!!!
torch.set_num_threads(1)

sqls = SQLService()
faisss = FaissIndexService()


# loading the encoder models
def _load_encoders() -> Dict[IndexType, SentenceTransformer]:
    encoders = dict()

    image_encoder = conf.docprepro.simsearch.image_encoder.model
    logger.debug(f"Loading image encoder model {image_encoder} ...")
    encoders[IndexType.IMAGE] = SentenceTransformer(conf.docprepro.simsearch.image_encoder.model,
                                                    device=conf.docprepro.simsearch.image_encoder.device)

    text_encoder = conf.docprepro.simsearch.text_encoder.model
    logger.debug(f"Loading text encoder model {text_encoder} ...")
    encoders[IndexType.TEXT] = SentenceTransformer(conf.docprepro.simsearch.text_encoder.model,
                                                   device=conf.docprepro.simsearch.text_encoder.device)

    return encoders


encoders = _load_encoders()
text_encoder_batch_size = conf.docprepro.simsearch.text_encoder.batch_size
text_encoder_min_sentence_length = conf.docprepro.simsearch.text_encoder.min_sentence_length
image_encoder_batch_size = conf.docprepro.simsearch.image_encoder.batch_size


@celery_worker.task(acks_late=True)
def index_text_document(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    # assume that all PPTDs come from the same project!
    proj_id = pptds[0].project_id
    # get the actual sentence span annotations
    sdoc_ids = [pptd.sdoc_id for pptd in pptds]
    with sqls.db_session() as db:
        sent_spans = crud_span_anno.get_all_system_sentence_span_annotations_for_sdocs(db=db, sdoc_ids=sdoc_ids)
        sentence_texts, sentence_span_ids = [], []
        for span in sent_spans:
            span_text = span.span_text.text
            if len(span_text) >= text_encoder_min_sentence_length:
                sentence_texts.append(span_text)
                sentence_span_ids.append(span.id)

    # encode
    logger.debug(f"Encoding {len(sentence_texts)} sentences from {len(pptds)} documents!")
    encoded_sentences = encoders[IndexType.TEXT].encode(sentences=sentence_texts,
                                                        batch_size=text_encoder_batch_size,
                                                        show_progress_bar=True,
                                                        normalize_embeddings=True,
                                                        convert_to_numpy=True,
                                                        device=conf.docprepro.simsearch.text_encoder.device)

    # add to index (with the IDs of the SpanAnnotation IDs)
    faisss.add_to_index(embeddings=encoded_sentences,
                        embedding_ids=np.asarray(sentence_span_ids),
                        proj_id=proj_id,
                        index_type=IndexType.TEXT)

    with sqls.db_session() as db:
        for sdoc_id in sdoc_ids:
            crud_sdoc.update_status(db=db,
                                    sdoc_id=sdoc_id,
                                    sdoc_status=SDocStatus.added_document_to_faiss_index)

    return pptds


@celery_worker.task(acks_late=True)
def index_image_document(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
    if len(ppids) == 0:
        return ppids

    # assume that all PPIDs come from the same project!
    proj_id = ppids[0].project_id
    # get the actual sentence span annotations
    sdoc_ids = [ppid.sdoc_id for ppid in ppids]

    # load the images (and keep the files open!)
    logger.debug(f"Loading {len(ppids)} images...")
    image_files = [ppid.image_dst for ppid in ppids]
    images: List[Image] = list()
    for f in image_files:
        img = Image.open(f)
        if img.mode != "RGB":
            img = img.convert("RGB")
        images.append(img)

    # encode
    logger.debug(f"Encoding {len(ppids)} images...")
    encoded_images = encoders[IndexType.IMAGE].encode(sentences=images,
                                                      batch_size=text_encoder_batch_size,
                                                      show_progress_bar=True,
                                                      normalize_embeddings=True,
                                                      convert_to_numpy=True,
                                                      device=conf.docprepro.simsearch.text_encoder.device)

    # close the image files again
    map(lambda image: image.close(), images)

    # add to index (with the IDs of the SDocs)
    faisss.add_to_index(embeddings=encoded_images,
                        embedding_ids=np.asarray(sdoc_ids),
                        proj_id=proj_id,
                        index_type=IndexType.IMAGE)

    with sqls.db_session() as db:
        for sdoc_id in sdoc_ids:
            crud_sdoc.update_status(db=db,
                                    sdoc_id=sdoc_id,
                                    sdoc_status=SDocStatus.added_document_to_faiss_index)

    return ppids


# TODO Flo: move search stuff to other file

@celery_worker.task(acks_late=True)
def find_similar_images(proj_id: int, query: Union[str, Image.Image], top_k: int = 10) -> Dict[int, float]:
    encoded_query = _encode_query(query=query)
    sdoc_ids_with_dists = faisss.search_index(proj_id=proj_id,
                                              index_type=IndexType.IMAGE,
                                              query=encoded_query,
                                              top_k=top_k)
    return sdoc_ids_with_dists


@celery_worker.task(acks_late=True)
def find_similar_sentences(proj_id: int, query: Union[str, Image.Image], top_k: int = 10) -> Dict[int, float]:
    encoded_query = _encode_query(query=query)
    span_anno_ids_with_dists = faisss.search_index(proj_id=proj_id,
                                                   index_type=IndexType.TEXT,
                                                   query=encoded_query,
                                                   top_k=top_k)
    return span_anno_ids_with_dists


def _encode_query(query: Union[str, Image.Image]) -> np.ndarray:
    if isinstance(query, str):
        encoded_query = encoders[IndexType.TEXT].encode(sentences=query,
                                                        batch_size=1,
                                                        show_progress_bar=False,
                                                        normalize_embeddings=True,
                                                        device="cpu")

    elif isinstance(query, Image.Image):
        # noinspection PyTypeChecker
        encoded_query = encoders[IndexType.IMAGE].encode(sentences=query,
                                                         batch_size=1,
                                                         show_progress_bar=False,
                                                         normalize_embeddings=True,
                                                         device="cpu")
    else:
        raise NotImplementedError("Only Strings or Images are supported as Query!")

    return encoded_query
