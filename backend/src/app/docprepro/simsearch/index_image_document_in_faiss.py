from pathlib import Path
from typing import List

import numpy as np
import torch
from PIL import Image
from loguru import logger
from sentence_transformers import SentenceTransformer

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.source_document import SDocStatus
from app.core.db.sql_service import SQLService
from app.core.search.faiss_index_service import FaissIndexService
from app.core.search.index_type import IndexType
from app.docprepro.image.models.preproimagedoc import PreProImageDoc
from config import conf

# Flo: This is important! Otherwise, it will not work with celery thread management and just hang!!!
torch.set_num_threads(1)

sqls = SQLService()
faisss = FaissIndexService()

image_encoder_batch_size = conf.docprepro.simsearch.image_encoder.batch_size


# loading the encoder models
def _load_image_encoder() -> SentenceTransformer:
    image_encoder_model = conf.docprepro.simsearch.image_encoder.model
    logger.debug(f"Loading image encoder model {image_encoder_model} ...")
    return SentenceTransformer(conf.docprepro.simsearch.image_encoder.model,
                               device=conf.docprepro.simsearch.image_encoder.device)


image_encoder = _load_image_encoder()


def load_image(img_p: Path) -> Image.Image:
    img = Image.open(img_p)
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img


def index_image_document_in_faiss_(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
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
        images.append(load_image(f))

    # encode
    logger.debug(f"Encoding {len(ppids)} images...")
    encoded_images = image_encoder.encode(sentences=images,
                                          batch_size=image_encoder_batch_size,
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
                                    sdoc_status=SDocStatus.index_image_document_in_faiss)

    return ppids
