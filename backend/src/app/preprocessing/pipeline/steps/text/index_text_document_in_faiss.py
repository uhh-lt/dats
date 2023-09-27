from typing import List

import numpy as np
from app.core.data.crud.faiss_sentence_source_document_link import (
    crud_faiss_sentence_link,
)
from app.core.data.dto.faiss_sentence_source_document_link import (
    FaissSentenceSourceDocumentLinkCreate,
)
from app.core.db.sql_service import SQLService
from app.core.search.index_type import IndexType
from app.core.search.simsearch_service import SimSearchService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.clip import ClipTextEmbeddingInput
from config import conf
from loguru import logger

sqls = SQLService(echo=False)
sss = SimSearchService()
rms = RayModelService()

MIN_SENTENCE_LENGTH = conf.preprocessing.text.min_sentence_length


def index_text_document_in_faiss(cargo: PipelineCargo) -> PipelineCargo:
    # assume that all PPTDs come from the same project!
    pptd: PreProTextDoc = cargo.data["pptd"]
    sdoc_id = cargo.data["sdoc_id"]
    proj_id = pptd.project_id

    # create the links between sdoc sentences (that are stored in ES)
    #  and faiss sentence embeddings
    links: List[FaissSentenceSourceDocumentLinkCreate] = []
    sentences: List[str] = []
    for sentence_id, sentence in enumerate(pptd.sentences):
        if len(sentence.text) >= MIN_SENTENCE_LENGTH:
            sentences.append(sentence.text)
            links.append(
                FaissSentenceSourceDocumentLinkCreate(
                    source_document_id=sdoc_id, sentence_id=sentence_id
                )
            )

    if len(links) > 0 and len(sentences) > 0:
        # encode sentences
        logger.debug(f"Encoding {len(sentences)} sentences from {pptd.filename}!")
        encoded_sentences = rms.clip_text_embedding(
            ClipTextEmbeddingInput(text=sentences)
        )

        # insert links and return created link ids
        with sqls.db_session() as db:
            faiss_sentence_link_ids = [
                crud_faiss_sentence_link.create(db=db, create_dto=link).id
                for link in links
            ]

        # add to index (with the IDs of the faiss sentence links)
        sss.add_embeddings_to_index(
            embeddings=encoded_sentences.numpy(),
            embedding_ids=np.asarray(faiss_sentence_link_ids),
            proj_id=proj_id,
            index_type=IndexType.TEXT,
        )
    else:
        logger.debug("No sentences to encode and add to the faiss index!")

    return cargo
