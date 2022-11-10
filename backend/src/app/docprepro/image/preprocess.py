from pathlib import Path
from typing import List

import torch
from PIL import Image
from loguru import logger
from tqdm import tqdm
from transformers import DetrFeatureExtractor, DetrForObjectDetection
from transformers import VisionEncoderDecoderModel, ViTFeatureExtractor, AutoTokenizer

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.code import crud_code
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.annotation_document import AnnotationDocumentCreate, AnnotationDocumentRead
from app.core.data.dto.bbox_annotation import BBoxAnnotationCreate
from app.core.data.dto.source_document import SDocStatus
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.image.autobbox import AutoBBox
from app.docprepro.image.preproimagedoc import PreProImageDoc
from app.docprepro.image.util import generate_preproimagedoc
from app.docprepro.text.preprotextdoc import PreProTextDoc
from app.docprepro.util import persist_as_sdoc, update_sdoc_status
from config import conf

# Flo: This is important! Otherwise, it will not work with celery thread management and just hang!!!
torch.set_num_threads(1)

sql = SQLService(echo=False)
repo = RepoService()

logger.debug(f"Loading DetrFeatureExtractor {conf.docprepro.image.object_detection.model} ...")
object_detection_feature_extractor = DetrFeatureExtractor.from_pretrained(conf.docprepro.image.object_detection.model,
                                                                          device=conf.docprepro.image.image_captioning.device)

logger.debug(f"Loading DetrForObjectDetection {conf.docprepro.image.object_detection.model} ...")
object_detection_model = DetrForObjectDetection.from_pretrained(conf.docprepro.image.object_detection.model)
object_detection_model.to(conf.docprepro.image.object_detection.device)

object_detection_model.eval()

logger.debug(f"Loading ViTFeatureExtractor {conf.docprepro.image.image_captioning.model} ...")
image_captioning_feature_extractor = ViTFeatureExtractor.from_pretrained(conf.docprepro.image.image_captioning.model)

logger.debug(f"Loading VisionEncoderDecoderModel {conf.docprepro.image.image_captioning.model} ...")
image_captioning_model = VisionEncoderDecoderModel.from_pretrained(conf.docprepro.image.image_captioning.model)
image_captioning_model.to(conf.docprepro.image.image_captioning.device)
image_captioning_model.eval()

image_captioning_tokenizer = AutoTokenizer.from_pretrained(conf.docprepro.image.image_captioning.model)

# Flo: This has to be in order!!! (for object detection with DETR)
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


@celery_worker.task(acks_late=True)
def import_uploaded_image_document(doc_file_path: Path,
                                   project_id: int) -> List[PreProImageDoc]:
    dst, sdoc_db_obj = persist_as_sdoc(doc_file_path, project_id)
    ppid = generate_preproimagedoc(filepath=dst, sdoc_db_obj=sdoc_db_obj)

    # Flo: update sdoc status
    update_sdoc_status(sdoc_id=ppid.sdoc_id, sdoc_status=SDocStatus.imported_uploaded_image_document)

    # Flo: We return a list here so that we can use text PrePro also with archives which contain multiple docs
    return [ppid]


@celery_worker.task(acks_late=True)
def generate_automatic_bbox_annotations(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
    global object_detection_feature_extractor
    global object_detection_model
    device = conf.docprepro.image.object_detection.device

    for ppid in tqdm(ppids, desc="Generating Automatic BBox Annotations... "):
        # Flo: let the DETR detect and classify objects in the image
        with Image.open(ppid.image_dst) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            inputs = object_detection_feature_extractor(img, return_tensors="pt")
            inputs.to(device)
            outputs = object_detection_model(**inputs)
            img_size = torch.tensor([tuple(reversed(img.size))]).to(device)
            output_dict = object_detection_feature_extractor.post_process(outputs, img_size)[0]

        # Flo: apply the confidence threshold
        confidence_threshold = conf.docprepro.image.object_detection.confidence_threshold
        keep = output_dict["scores"] > confidence_threshold
        # TODO Flo: do we want to persist confidences? Yes!
        confidences = output_dict["scores"][keep].tolist()
        bboxes = output_dict["boxes"][keep].int().tolist()
        label_ids = output_dict["labels"][keep].tolist()
        labels = [coco2017_labels[lid].upper() for lid in label_ids]

        # Flo: generate the AutoBBoxes
        for (x_min, y_min, x_max, y_max), code in zip(bboxes, labels):
            bbox = AutoBBox(code=code, x_min=x_min, y_min=y_min, x_max=x_max, y_max=y_max)
            ppid.bboxes.append(bbox)

        update_sdoc_status(sdoc_id=ppid.sdoc_id, sdoc_status=SDocStatus.generated_automatic_bbox_annotations)

    return ppids


@celery_worker.task(acks_late=True)
def generate_automatic_image_captions(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
    global image_captioning_feature_extractor
    global image_captioning_model
    global image_captioning_tokenizer
    device = conf.docprepro.image.image_captioning.device

    with tqdm(total=len(ppids), desc="Generating automatic image captions...") as pbar:
        images: List[Image] = []
        for ppid in ppids:
            # Flo: open the images to create an image batch for faster forwarding
            img = Image.open(ppid.image_dst)
            if img.mode != "RGB":
                img = img.convert("RGB")
            images.append(img)

        pixel_values = image_captioning_feature_extractor(images=images, return_tensors="pt").pixel_values.to(device)

        # Flo: close the images again
        for img in images:
            img.close()

        max_caption_length = conf.docprepro.image.image_captioning.max_caption_length
        num_beams = conf.docprepro.image.image_captioning.num_beams
        output_ids = image_captioning_model.generate(pixel_values, max_length=max_caption_length, num_beams=num_beams)

        captions = image_captioning_tokenizer.batch_decode(output_ids, skip_special_tokens=True)
        captions = [cap.strip() for cap in captions]

        # create metadata holding the captions
        for ppid, cap in zip(ppids, captions):
            sdoc_meta_create_dto = SourceDocumentMetadataCreate(key="caption",
                                                                value=cap,
                                                                source_document_id=ppid.sdoc_id,
                                                                read_only=True)
            # persist SourceDocumentMetadata
            with sql.db_session() as db:
                crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)

            ppid.metadata[sdoc_meta_create_dto.key] = sdoc_meta_create_dto.value

            update_sdoc_status(sdoc_id=ppid.sdoc_id, sdoc_status=SDocStatus.generated_automatic_image_captions)
            pbar.update(1)

    return ppids


@celery_worker.task(acks_late=True)
def persist_automatic_bbox_annotations(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
    for ppid in tqdm(ppids, desc="Persisting automatic BBox Annotations..."):
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
        update_sdoc_status(sdoc_id=ppid.sdoc_id, sdoc_status=SDocStatus.persisted_automatic_bbox_annotations)
    return ppids


@celery_worker.task(acks_late=True)
def create_pptds_from_automatic_caption(ppids: List[PreProImageDoc]) -> List[PreProTextDoc]:
    # Flo: create fake PPTDs to send them to the text worker to generate textual information and store in ES
    #  Note that this has to be in its own async callable function to enable modular celery calls w/o dependencies
    fake_pptds = [PreProTextDoc(filename=ppid.image_dst.name,
                                project_id=ppid.project_id,
                                sdoc_id=ppid.sdoc_id,
                                text=ppid.metadata["caption"],
                                html=ppid.metadata["caption"],
                                metadata={"language": "en"})
                  for ppid in ppids]
    for fake_pptd in fake_pptds:
        update_sdoc_status(sdoc_id=fake_pptd.sdoc_id, sdoc_status=SDocStatus.created_pptds_from_automatic_caption)
    return fake_pptds
