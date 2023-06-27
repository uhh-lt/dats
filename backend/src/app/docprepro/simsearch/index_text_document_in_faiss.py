from typing import List

import numpy as np
import torch
from loguru import logger

from app.core.data.crud.faiss_sentence_source_document_link import (
    crud_faiss_sentence_link,
)
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.faiss_sentence_source_document_link import (
    FaissSentenceSourceDocumentLinkCreate,
)
from app.core.data.dto.source_document import SDocStatus
from app.core.db.sql_service import SQLService
from app.core.search.faiss_index_service import FaissIndexService
from app.core.search.index_type import IndexType
from app.docprepro.simsearch.util import text_encoder
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from config import conf

# Flo: This is important! Otherwise, it will not work with celery thread management and just hang!!!
torch.set_num_threads(1)

sqls = SQLService(echo=False)
faisss = FaissIndexService()

text_encoder_batch_size = conf.docprepro.simsearch.text_encoder.batch_size
text_encoder_min_sentence_length = (
    conf.docprepro.simsearch.text_encoder.min_sentence_length
)


def index_text_document_in_faiss_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    # assume that all PPTDs come from the same project!
    proj_id = pptds[0].project_id
    sdoc_ids = [pptd.sdoc_id for pptd in pptds]

    # create the links between sdoc sentences (that are stored in ES)
    #  and faiss sentence embeddings
    links = []
    sentences = []
    for pptd in pptds:
        for sentence_id, sentence in enumerate(pptd.sentences):
            if len(sentence.text) >= text_encoder_min_sentence_length:
                sentences.append(sentence.text)
                links.append(
                    FaissSentenceSourceDocumentLinkCreate(
                        source_document_id=pptd.sdoc_id, sentence_id=sentence_id
                    )
                )

    if len(links) > 0 and len(sentences) > 0:
        # encode sentences
        logger.debug(
            f"Encoding {len(sentences)} sentences from {len(pptds)} documents!"
        )
        try:
            encoded_sentences = text_encoder.encode(
                sentences=sentences,
                batch_size=text_encoder_batch_size,
                show_progress_bar=True,
                normalize_embeddings=True,
                convert_to_numpy=True,
                device=conf.docprepro.simsearch.text_encoder.device,
            )
        except RuntimeError as e:
            logger.error(f"Thread Pool crashed: {e} ... Retrying!")
            encoded_sentences = text_encoder.encode(
                sentences=sentences,
                batch_size=text_encoder_batch_size,
                show_progress_bar=True,
                normalize_embeddings=True,
                convert_to_numpy=True,
                device=conf.docprepro.simsearch.text_encoder.device,
            )

        # insert links and return created link ids
        with sqls.db_session() as db:
            faiss_sentence_link_ids = [
                crud_faiss_sentence_link.create(db=db, create_dto=link).id
                for link in links
            ]

        # add to index (with the IDs of the faiss sentence links)
        faisss.add_to_index(
            embeddings=encoded_sentences,
            embedding_ids=np.asarray(faiss_sentence_link_ids),
            proj_id=proj_id,
            index_type=IndexType.TEXT,
        )
    else:
        logger.debug(f"No sentences to encode and add to the faiss index!")

    with sqls.db_session() as db:
        for sdoc_id in sdoc_ids:
            crud_sdoc.update_status(
                db=db,
                sdoc_id=sdoc_id,
                sdoc_status=SDocStatus.index_text_document_in_faiss,
            )

    return pptds
