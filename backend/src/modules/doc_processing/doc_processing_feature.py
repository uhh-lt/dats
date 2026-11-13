from common.artefact_enum import Artefact
from common.feature_enum import FeatureArea
from systems.feature_system.feature_registry import register_feature

ENTITY_ANNOTATIONS = register_feature(
    "entity_annotations",
    title="Automatic Entity Annotations",
    description="Annotate named entities (persons, organizations, places, ...) in all text automatically.",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_artefacts={Artefact.NER_SPANS},
)

OBJECT_DETECTION = register_feature(
    "object_detection",
    title="Automatic Object Detection",
    description="Annotate the objects in all images automatically with bounding boxes.",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_artefacts={Artefact.OBJECT_BBOXES},
)
