from common.artefact_enum import Artefact
from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.ENTITY_ANNOTATIONS,
    title="Automatic entity annotations",
    description="Annotate named entities (persons, organizations, places, ...) in all text automatically.",
    requires_artefacts={Artefact.NER_SPANS},
    requires_features=set(),
)

register_feature(
    Feature.IMAGE_CAPTIONS,
    title="Image captions",
    description="Describe every image with a generated caption, which makes the images searchable and annotatable as text.",
    requires_artefacts={Artefact.IMAGE_CAPTION},
    requires_features=set(),
)

register_feature(
    Feature.OBJECT_DETECTION,
    title="Automatic object detection",
    description="Annotate the objects in all images automatically with bounding boxes.",
    requires_artefacts={Artefact.OBJECT_BBOXES},
    requires_features=set(),
)
