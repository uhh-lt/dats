from common.artefact_enum import Artefact
from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.ENTITY_ANNOTATIONS,
    requires_artefacts={Artefact.NER_SPANS},
    requires_features=set(),
)

register_feature(
    Feature.IMAGE_CAPTIONS,
    requires_artefacts={Artefact.IMAGE_CAPTION},
    requires_features=set(),
)

register_feature(
    Feature.OBJECT_DETECTION,
    requires_artefacts={Artefact.OBJECT_BBOXES},
    requires_features=set(),
)
