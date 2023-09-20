from pathlib import Path
from typing import List

import torch
from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.image.convert_to_webp_and_generate_thumbnails import (
    convert_to_webp_and_generate_thumbnails_,
)
from app.docprepro.image.create_pptd_from_caption import create_pptd_from_caption_
from app.docprepro.image.generate_bbox_annotations import generate_bbox_annotations_
from app.docprepro.image.generate_image_captions import generate_image_captions_
from app.docprepro.image.import_image_document import import_image_document_
from app.docprepro.image.models.preproimagedoc import PreProImageDoc
from app.docprepro.image.store_bbox_annotations_in_db import (
    store_bbox_annotations_in_db_,
)
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from config import conf
from loguru import logger
from transformers import (
    AutoTokenizer,
    DetrFeatureExtractor,
    DetrForObjectDetection,
    VisionEncoderDecoderModel,
    ViTFeatureExtractor,
)

# Flo: This is important! Otherwise, it will not work with celery thread management and just hang!!!
torch.set_num_threads(1)

logger.debug(
    f"Loading DetrFeatureExtractor {conf.docprepro.image.object_detection.model} ..."
)
object_detection_feature_extractor = DetrFeatureExtractor.from_pretrained(
    conf.docprepro.image.object_detection.model,
    device=conf.docprepro.image.image_captioning.device,
)

logger.debug(
    f"Loading DetrForObjectDetection {conf.docprepro.image.object_detection.model} ..."
)
object_detection_model = DetrForObjectDetection.from_pretrained(
    conf.docprepro.image.object_detection.model
)
object_detection_model.to(conf.docprepro.image.object_detection.device)

object_detection_model.eval()

logger.debug(
    f"Loading ViTFeatureExtractor {conf.docprepro.image.image_captioning.model} ..."
)
image_captioning_feature_extractor = ViTFeatureExtractor.from_pretrained(
    conf.docprepro.image.image_captioning.model
)

logger.debug(
    f"Loading VisionEncoderDecoderModel {conf.docprepro.image.image_captioning.model} ..."
)
image_captioning_model = VisionEncoderDecoderModel.from_pretrained(
    conf.docprepro.image.image_captioning.model
)
image_captioning_model.to(conf.docprepro.image.image_captioning.device)
image_captioning_model.eval()

image_captioning_tokenizer = AutoTokenizer.from_pretrained(
    conf.docprepro.image.image_captioning.model
)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def import_image_document(
    doc_file_path: Path, project_id: int, mime_type: str
) -> List[PreProImageDoc]:
    return import_image_document_(doc_file_path, project_id, mime_type)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def convert_to_webp_and_generate_thumbnails(
    ppids: List[PreProImageDoc],
) -> List[PreProImageDoc]:
    return convert_to_webp_and_generate_thumbnails_(ppids)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def generate_bbox_annotations(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
    global object_detection_feature_extractor
    global object_detection_model
    # todo: can i define the models in the other file?
    return generate_bbox_annotations_(
        ppids, object_detection_feature_extractor, object_detection_model
    )


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def generate_image_captions(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
    global image_captioning_feature_extractor
    global image_captioning_model
    global image_captioning_tokenizer
    # todo: can i define the models in the other file?
    return generate_image_captions_(
        ppids,
        image_captioning_feature_extractor,
        image_captioning_model,
        image_captioning_tokenizer,
    )


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def store_bbox_annotations_in_db(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
    return store_bbox_annotations_in_db_(ppids)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def create_pptd_from_caption(ppids: List[PreProImageDoc]) -> List[PreProTextDoc]:
    return create_pptd_from_caption_(ppids)
