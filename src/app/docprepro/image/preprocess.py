from pathlib import Path

import torch
from PIL import Image
from fastapi import UploadFile
from loguru import logger
from transformers import DetrFeatureExtractor, DetrForObjectDetection

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.code import crud_code
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.annotation_document import AnnotationDocumentCreate, AnnotationDocumentRead
from app.core.data.dto.bbox_annotation import BBoxAnnotationCreate
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.celery.celery_worker import celery_prepro_worker
from app.docprepro.image.autobbox import AutoBBox
from app.docprepro.image.preproimagedoc import PreProImageDoc
from config import conf

# Flo: This is important! Otherwise it will not work with celery thread management and just hang!!!
torch.set_num_threads(1)

sql = SQLService(echo=False)
repo = RepoService()

# FIXME Flo: Use the cached model! --> set HUGGINGFACE_CACHE to /image_models (in the container)
feature_extractor = DetrFeatureExtractor.from_pretrained(conf.docprepro.image.default_detr_model)
model = DetrForObjectDetection.from_pretrained(conf.docprepro.image.default_detr_model)
model.eval()

# Flo: This has to be in order!!!
coco2017_labels = ['background', 'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus',
                   'train', 'truck', 'boat', 'traffic light', 'fire hydrant',
                   'street sign', 'stop sign', 'parking meter', 'bench', 'bird',
                   'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
                   'giraffe', 'hat', 'backpack', 'umbrella', 'shoe', 'eye glasses',
                   'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard',
                   'sports ball', 'kite', 'baseball bat', 'baseball glove',
                   'skateboard', 'surfboard', 'tennis racket', 'bottle', 'plate',
                   'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana',
                   'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog',
                   'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed',
                   'mirror', 'dining table', 'window', 'desk', 'toilet', 'door', 'tv',
                   'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave',
                   'oven', 'toaster', 'sink', 'refrigerator', 'blender', 'book',
                   'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
                   'toothbrush']


@celery_prepro_worker.task(acks_late=True)
def import_uploaded_image_document(doc_file: UploadFile,
                                   project_id: int) -> PreProImageDoc:
    global sql
    global repo

    # save the file to disk
    dst, create_dto = repo.store_uploaded_document(doc_file=doc_file,
                                                   project_id=project_id)

    # persist SourceDocument
    with sql.db_session() as db:
        sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

    # create PreProDoc
    ppid = PreProImageDoc(project_id=project_id,
                          sdoc_id=sdoc_db_obj.id,
                          image_dst=Path(dst))

    with Image.open(dst) as img:
        # store image metadata as SourceDocumentMetadata
        for meta in ["width", "height"]:
            sdoc_meta_create_dto = SourceDocumentMetadataCreate(key=meta,
                                                                value=str(getattr(img, meta)),
                                                                source_document_id=sdoc_db_obj.id,
                                                                read_only=True)
            # persist SourceDocumentMetadata
            with sql.db_session() as db:
                crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)

            ppid.metadata[sdoc_meta_create_dto.key] = sdoc_meta_create_dto.value

    # store the URL to the file as SourceDocumentMetadata
    sdoc = SourceDocumentRead.from_orm(sdoc_db_obj)
    sdoc_meta_create_dto = SourceDocumentMetadataCreate(key="url",
                                                        value=str(repo.get_sdoc_url(sdoc=sdoc)),
                                                        source_document_id=sdoc_db_obj.id,
                                                        read_only=True)
    # persist SourceDocumentMetadata
    with sql.db_session() as db:
        crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)
    ppid.metadata[sdoc_meta_create_dto.key] = sdoc_meta_create_dto.value

    return ppid


@celery_prepro_worker.task(acks_late=True)
def generate_automatic_bbox_annotations(ppid: PreProImageDoc) -> PreProImageDoc:
    global feature_extractor
    global model

    # Flo: let the DETR detect and classify objects in the image
    with Image.open(ppid.image_dst) as img:
        if img.mode != "RGB":
            img = img.convert("RGB")
        inputs = feature_extractor(img, return_tensors="pt")
        outputs = model(**inputs)
        img_size = torch.tensor([tuple(reversed(img.size))])
        output_dict = feature_extractor.post_process(outputs, img_size)[0]

    # Flo: apply the confidence threshold
    confidence_threshold = conf.docprepro.image.confidence_threshold
    keep = output_dict["scores"] > confidence_threshold
    # TODO Flo: do we want to persist confidences?
    confidences = output_dict["scores"][keep].tolist()
    bboxes = output_dict["boxes"][keep].int().tolist()
    label_ids = output_dict["labels"][keep].tolist()
    labels = [coco2017_labels[lid].upper() for lid in label_ids]

    # Flo: generate the AutoBBoxes
    for (x_min, y_min, x_max, y_max), code in zip(bboxes, labels):
        bbox = AutoBBox(code=code, x_min=x_min, y_min=y_min, x_max=x_max, y_max=y_max)
        ppid.bboxes.append(bbox)

    return ppid


@celery_prepro_worker.task(acks_late=True)
def persist_automatic_bbox_annotations(ppid: PreProImageDoc) -> None:
    # create AnnoDoc for system user
    with SQLService().db_session() as db:
        adoc_create = AnnotationDocumentCreate(source_document_id=ppid.sdoc_id,
                                               user_id=SYSTEM_USER_ID)

        adoc_db = crud_adoc.create(db=db, create_dto=adoc_create)
        adoc_read = AnnotationDocumentRead.from_orm(adoc_db)

        # convert AutoBBoxes to BBoxAnnotations
        for bbox in ppid.bboxes:
            db_code = crud_code.read_by_name_and_user_and_project(db,
                                                                  code_name=bbox.code,
                                                                  user_id=SYSTEM_USER_ID,
                                                                  proj_id=ppid.project_id)

            if not db_code:
                # FIXME FLO: create code on the fly for system user?
                logger.warning(f"No Code <{bbox.code}> found! Skipping persistence of BBoxAnnotation ...")
                continue

            ccid = db_code.current_code.id

            create_dto = BBoxAnnotationCreate(x_min=bbox.x_min,
                                              x_max=bbox.x_max,
                                              y_min=bbox.y_min,
                                              y_max=bbox.y_max,
                                              current_code_id=ccid,
                                              annotation_document_id=adoc_read.id)

            crud_bbox_anno.create(db, create_dto=create_dto)
