from common.feature_enum import FeatureArea
from modules.doc_processing.html.ner_artefact import NER_SPANS
from modules.doc_processing.image.object_detection_artefact import OBJECT_BBOXES
from systems.feature_system.feature_registry import register_feature

ENTITY_ANNOTATIONS = register_feature(
    "entity_annotations",
    title="Automatic Entity Annotations",
    description="Annotate named entities (persons, organizations, places, ...) in all text automatically.",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_artefacts={NER_SPANS},
)

OBJECT_DETECTION = register_feature(
    "object_detection",
    title="Automatic Object Detection",
    description="Annotate the objects in all images automatically with bounding boxes.",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_artefacts={OBJECT_BBOXES},
)
