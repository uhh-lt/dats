from common.feature_enum import FeatureArea
from modules.object_detection.object_detection_artefact import OBJECT_BBOXES
from systems.feature_system.feature_registry import register_feature

OBJECT_DETECTION = register_feature(
    "object_detection",
    title="Automatic Object Detection",
    description="Annotate the objects in all images automatically with bounding boxes.",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_artefacts={OBJECT_BBOXES},
)
