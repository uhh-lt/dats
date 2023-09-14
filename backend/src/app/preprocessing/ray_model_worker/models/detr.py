import logging
from typing import List, Tuple

import torch
from config import conf
from dto.detr import DETRFilePathInput, DETRObjectDetectionOutput, ObjectBBox
from PIL import Image
from ray import serve
from transformers import DetrFeatureExtractor, DetrForObjectDetection

cc = conf.detr

DEVICE = cc.device
MODEL = cc.model
CONFIDENCE_THRESHOLD = cc.object_detection.confidence_threshold
COCO_2017_LABELS = cc.object_detection.coco2017_labels

logger = logging.getLogger("ray.serve")


@serve.deployment(
    ray_actor_options={"num_gpus": 1},
    autoscaling_config={
        "min_replicas": 0,
        "max_replicas": 2,
    },
)
class DETRModel:
    def __init__(self):
        logger.debug(f"Loading DetrFeatureExtractor {MODEL} ...")
        feature_extractor = DetrFeatureExtractor.from_pretrained(MODEL, device=DEVICE)

        logger.debug(f"Loading DetrForObjectDetection {MODEL} ...")
        object_detection_model: DetrForObjectDetection = (
            DetrForObjectDetection.from_pretrained(MODEL)
        )
        object_detection_model.to(DEVICE)
        object_detection_model.eval()

        self.feature_extractor: DetrFeatureExtractor = feature_extractor
        self.object_detection_model: DetrForObjectDetection = object_detection_model

    def object_detection(self, input: DETRFilePathInput) -> DETRObjectDetectionOutput:
        with Image.open(input.image_fp) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            inputs = self.feature_extractor(img, return_tensors="pt").to(DEVICE)
            with torch.no_grad():
                outputs = self.object_detection_model(**inputs)
            img_size = torch.tensor([tuple(reversed(img.size))]).to(DEVICE)
            output_dict = self.feature_extractor.post_process(outputs, img_size)[0]

        # Flo: apply the confidence threshold
        keep = output_dict["scores"] > CONFIDENCE_THRESHOLD
        confidences: List[float] = output_dict["scores"][keep].tolist()
        boxes: List[Tuple[int, int, int, int]] = (
            output_dict["boxes"][keep].int().tolist()
        )
        label_ids: List[int] = output_dict["labels"][keep].tolist()
        labels: List[str] = [COCO_2017_LABELS[lid].upper() for lid in label_ids]

        bboxes: List[ObjectBBox] = []
        for (x_min, y_min, x_max, y_max), label, confidence in zip(
            boxes, labels, confidences
        ):
            bbox = ObjectBBox(
                label=label,
                x_min=x_min,
                y_min=y_min,
                x_max=x_max,
                y_max=y_max,
                confidence=confidence,
            )
            bboxes.append(bbox)

        return DETRObjectDetectionOutput(bboxes=bboxes)
