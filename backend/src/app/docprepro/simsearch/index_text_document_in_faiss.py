from typing import List

import numpy as np
import torch
from loguru import logger
from sentence_transformers import SentenceTransformer

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.source_document import SDocStatus
from app.core.db.sql_service import SQLService
from app.core.search.faiss_index_service import FaissIndexService
from app.core.search.index_type import IndexType
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from config import conf

# Flo: This is important! Otherwise, it will not work with celery thread management and just hang!!!
torch.set_num_threads(1)

sqls = SQLService()
faisss = FaissIndexService()

text_encoder_batch_size = conf.docprepro.simsearch.text_encoder.batch_size
text_encoder_min_sentence_length = conf.docprepro.simsearch.text_encoder.min_sentence_length


# loading the encoder models
def _load_text_encoder() -> SentenceTransformer:
    text_encoder_model = conf.docprepro.simsearch.text_encoder.model
    logger.debug(f"Loading text encoder model {text_encoder_model} ...")
    return SentenceTransformer(conf.docprepro.simsearch.text_encoder.model,
                               device=conf.docprepro.simsearch.text_encoder.device)


text_encoder = _load_text_encoder()


def index_text_document_in_faiss_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    # assume that all PPTDs come from the same project!
    proj_id = pptds[0].project_id
    # get the actual sentence span annotations
    sdoc_ids = [pptd.sdoc_id for pptd in pptds]
    with sqls.db_session() as db:
        # todo: this is not necessary, right?
        # sentence_texts = [sent.text for pptd in pptds for sent in pptd.spans["SENTENCE"]]
        sent_spans = crud_span_anno.get_all_system_sentence_span_annotations_for_sdocs(db=db, sdoc_ids=sdoc_ids)
        sentence_texts, sentence_span_ids = [], []
        for span in sent_spans:
            span_text = span.span_text.text
            if len(span_text) >= text_encoder_min_sentence_length:
                sentence_texts.append(span_text)
                sentence_span_ids.append(span.id)

    if len(sentence_texts) > 0:
        # encode
        logger.debug(f"Encoding {len(sentence_texts)} sentences from {len(pptds)} documents!")
        try:
            encoded_sentences = text_encoder.encode(sentences=sentence_texts,
                                                    batch_size=text_encoder_batch_size,
                                                    show_progress_bar=True,
                                                    normalize_embeddings=True,
                                                    convert_to_numpy=True,
                                                    device=conf.docprepro.simsearch.text_encoder.device)
        except RuntimeError as e:
            logger.error(f"Thread Pool crashed: {e} ... Retrying!")
            encoded_sentences = text_encoder.encode(sentences=sentence_texts,
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
    else:
        logger.debug(f"No sentences to encode and add to the faiss index!")

    with sqls.db_session() as db:
        for sdoc_id in sdoc_ids:
            crud_sdoc.update_status(db=db,
                                    sdoc_id=sdoc_id,
                                    sdoc_status=SDocStatus.index_text_document_in_faiss)

    return pptds
