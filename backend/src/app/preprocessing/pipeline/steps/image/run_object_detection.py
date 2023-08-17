from functools import lru_cache
from typing import List, Tuple

import torch
from loguru import logger
from PIL import Image
from transformers import DetrFeatureExtractor, DetrForObjectDetection

from app.preprocessing.pipeline.model.image.autobbox import AutoBBox
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from config import conf

DEVICE = conf.docprepro.image.object_detection.device
MODEL = conf.docprepro.image.object_detection.model
CONFIDENCE_THRESHOLD = conf.docprepro.image.object_detection.confidence_threshold

# Flo: This is important! Otherwise, it will not work with celery thread management and just hang!!!
torch.set_num_threads(1)


@lru_cache(maxsize=1)
def load_object_detection_models(
    foo: str = "bar",
) -> Tuple[DetrFeatureExtractor, DetrForObjectDetection]:
    logger.debug(f"Loading DetrFeatureExtractor {MODEL} ...")
    feature_extractor = DetrFeatureExtractor.from_pretrained(MODEL, device=DEVICE)

    logger.debug(f"Loading DetrForObjectDetection {MODEL} ...")
    object_detection_model = DetrForObjectDetection.from_pretrained(MODEL)
    object_detection_model.to(DEVICE)
    object_detection_model.eval()

    return feature_extractor, object_detection_model


# Flo: This has to be in order!!! (for object detection with DETR)
coco2017_labels = [
    "background",
    "person",
    "bicycle",
    "car",
    "motorcycle",
    "airplane",
    "bus",
    "train",
    "truck",
    "boat",
    "traffic light",
    "fire hydrant",
    "street sign",
    "stop sign",
    "parking meter",
    "bench",
    "bird",
    "cat",
    "dog",
    "horse",
    "sheep",
    "cow",
    "elephant",
    "bear",
    "zebra",
    "giraffe",
    "hat",
    "backpack",
    "umbrella",
    "shoe",
    "eye glasses",
    "handbag",
    "tie",
    "suitcase",
    "frisbee",
    "skis",
    "snowboard",
    "sports ball",
    "kite",
    "baseball bat",
    "baseball glove",
    "skateboard",
    "surfboard",
    "tennis racket",
    "bottle",
    "plate",
    "wine glass",
    "cup",
    "fork",
    "knife",
    "spoon",
    "bowl",
    "banana",
    "apple",
    "sandwich",
    "orange",
    "broccoli",
    "carrot",
    "hot dog",
    "pizza",
    "donut",
    "cake",
    "chair",
    "couch",
    "potted plant",
    "bed",
    "mirror",
    "dining table",
    "window",
    "desk",
    "toilet",
    "door",
    "tv",
    "laptop",
    "mouse",
    "remote",
    "keyboard",
    "cell phone",
    "microwave",
    "oven",
    "toaster",
    "sink",
    "refrigerator",
    "blender",
    "book",
    "clock",
    "vase",
    "scissors",
    "teddy bear",
    "hair drier",
    "toothbrush",
]


def run_object_detection(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]
    feature_extractor, object_detection_model = load_object_detection_models()
    with Image.open(ppid.filepath) as img:
        if img.mode != "RGB":
            img = img.convert("RGB")
        inputs = feature_extractor(img, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            outputs = object_detection_model(**inputs)
        img_size = torch.tensor([tuple(reversed(img.size))]).to(DEVICE)
        output_dict = feature_extractor.post_process(outputs, img_size)[0]

    # Flo: apply the confidence threshold
    keep = output_dict["scores"] > CONFIDENCE_THRESHOLD
    confidences: List[float] = output_dict["scores"][keep].tolist()
    bboxes: List[Tuple[int, int, int, int]] = output_dict["boxes"][keep].int().tolist()
    label_ids: List[int] = output_dict["labels"][keep].tolist()
    labels: List[str] = [coco2017_labels[lid].upper() for lid in label_ids]

    print("bboxes", bboxes)
    print("bboxes", bboxes)
    print("bboxes", bboxes)
    print("bboxes", bboxes)
    print("bboxes", bboxes)
    print("bboxes", bboxes)
    print("bboxes", bboxes)

    # Flo: generate the AutoBBoxes
    for (x_min, y_min, x_max, y_max), code, confidence in zip(
        bboxes, labels, confidences
    ):
        bbox = AutoBBox(
            code=code,
            x_min=x_min,
            y_min=y_min,
            x_max=x_max,
            y_max=y_max,
            confidence=confidence,
        )
        ppid.bboxes.append(bbox)

    return cargo
