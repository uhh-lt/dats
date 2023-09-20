from typing import List

import torch
from app.core.data.dto.source_document import SDocStatus
from app.docprepro.image.models.autobbox import AutoBBox
from app.docprepro.image.models.preproimagedoc import PreProImageDoc
from app.docprepro.util import update_sdoc_status
from config import conf
from PIL import Image
from tqdm import tqdm

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


def generate_bbox_annotations_(
    ppids: List[PreProImageDoc],
    object_detection_feature_extractor,
    object_detection_model,
) -> List[PreProImageDoc]:
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
            output_dict = object_detection_feature_extractor.post_process(
                outputs, img_size
            )[0]

        # Flo: apply the confidence threshold
        confidence_threshold = (
            conf.docprepro.image.object_detection.confidence_threshold
        )
        keep = output_dict["scores"] > confidence_threshold
        # TODO Flo: do we want to persist confidences? Yes!
        confidences = output_dict["scores"][keep].tolist()
        bboxes = output_dict["boxes"][keep].int().tolist()
        label_ids = output_dict["labels"][keep].tolist()
        labels = [coco2017_labels[lid].upper() for lid in label_ids]

        # Flo: generate the AutoBBoxes
        for (x_min, y_min, x_max, y_max), code in zip(bboxes, labels):
            bbox = AutoBBox(
                code=code, x_min=x_min, y_min=y_min, x_max=x_max, y_max=y_max
            )
            ppid.bboxes.append(bbox)

        update_sdoc_status(
            sdoc_id=ppid.sdoc_id, sdoc_status=SDocStatus.generate_bbox_annotations
        )

    return ppids
