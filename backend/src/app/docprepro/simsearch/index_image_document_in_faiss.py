from typing import List

import numpy as np
import torch
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.source_document import SDocStatus
from app.core.db.sql_service import SQLService
from app.core.search.faiss_index_service import FaissIndexService
from app.core.search.index_type import IndexType
from app.docprepro.simsearch.util import image_encoder, load_image
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from config import conf
from loguru import logger
from PIL import Image

# Flo: This is important! Otherwise, it will not work with celery thread management and just hang!!!
torch.set_num_threads(1)

sqls = SQLService(echo=False)
faisss = FaissIndexService()

image_encoder_batch_size = conf.preprocessing.simsearch.image_encoder.batch_size


def index_image_document_in_faiss_(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
    if len(ppids) == 0:
        return ppids

    # assume that all PPIDs come from the same project!
    proj_id = ppids[0].project_id
    sdoc_ids = [ppid.sdoc_id for ppid in ppids]

    # load the images (and keep the files open!)
    logger.debug(f"Loading {len(ppids)} images...")
    image_files = [ppid.image_dst for ppid in ppids]
    images: List[Image] = list()
    for f in image_files:
        images.append(load_image(f))

    # encode
    logger.debug(f"Encoding {len(ppids)} images...")
    try:
        encoded_images = image_encoder.encode(
            sentences=images,
            batch_size=image_encoder_batch_size,
            show_progress_bar=True,
            normalize_embeddings=True,
            convert_to_numpy=True,
            device=conf.preprocessing.simsearch.text_encoder.device,
        )
    except RuntimeError as e:
        logger.error(f"Thread Pool crashed: {e} ... Retrying!")
        encoded_images = image_encoder.encode(
            sentences=images,
            batch_size=image_encoder_batch_size,
            show_progress_bar=True,
            normalize_embeddings=True,
            convert_to_numpy=True,
            device=conf.preprocessing.simsearch.text_encoder.device,
        )

    # close the image files again
    map(lambda image: image.close(), images)

    # add to index (with the IDs of the SDocs)
    faisss.add_to_index(
        embeddings=encoded_images,
        embedding_ids=np.asarray(sdoc_ids),
        proj_id=proj_id,
        index_type=IndexType.IMAGE,
    )

    with sqls.db_session() as db:
        for sdoc_id in sdoc_ids:
            crud_sdoc.update_status(
                db=db,
                sdoc_id=sdoc_id,
                sdoc_status=SDocStatus.index_image_document_in_faiss,
            )

    return ppids
