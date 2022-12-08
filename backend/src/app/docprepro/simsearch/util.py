from pathlib import Path
from typing import Union

import numpy as np
from PIL import Image
from loguru import logger
from sentence_transformers import SentenceTransformer

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import DocType
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from config import conf


def _load_text_encoder() -> SentenceTransformer:
    text_encoder_model = conf.docprepro.simsearch.text_encoder.model
    logger.debug(f"Loading text encoder model {text_encoder_model} ...")
    return SentenceTransformer(conf.docprepro.simsearch.text_encoder.model,
                               device=conf.docprepro.simsearch.text_encoder.device)


def _load_image_encoder() -> SentenceTransformer:
    image_encoder_model = conf.docprepro.simsearch.image_encoder.model
    logger.debug(f"Loading image encoder model {image_encoder_model} ...")
    return SentenceTransformer(conf.docprepro.simsearch.image_encoder.model,
                               device=conf.docprepro.simsearch.image_encoder.device)


text_encoder = _load_text_encoder()
image_encoder = _load_image_encoder()


def load_image(img_p: Path) -> Image.Image:
    img = Image.open(img_p)
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img


def _load_image_with_sdoc_id(sdoc_id: int) -> Image:
    with SQLService().db_session() as db:
        sdoc = SourceDocumentRead.from_orm(crud_sdoc.read(db=db, id=sdoc_id))
        assert sdoc.doctype == DocType.image, f"SourceDocument with {sdoc_id=} is not an image!"

    img_p = RepoService().get_path_to_sdoc_file(sdoc=sdoc, raise_if_not_exists=True)
    return load_image(img_p=img_p)


def encode_query(query: Union[str, int]) -> np.ndarray:
    if isinstance(query, str) and query.isdigit():
        query = int(query)

    if isinstance(query, str):
        encoded_query = text_encoder.encode(sentences=query,
                                            batch_size=1,
                                            show_progress_bar=False,
                                            normalize_embeddings=True,
                                            device="cpu")

    elif isinstance(query, int):
        # query is a sdoc id of an image sdoc, hence we need to load that image from disk first
        img = _load_image_with_sdoc_id(sdoc_id=query)
        # noinspection PyTypeChecker
        encoded_query = image_encoder.encode(sentences=img,
                                             batch_size=1,
                                             show_progress_bar=False,
                                             normalize_embeddings=True,
                                             device="cpu")
    else:
        raise NotImplementedError("Only Strings or Images are supported as Query!")

    return encoded_query