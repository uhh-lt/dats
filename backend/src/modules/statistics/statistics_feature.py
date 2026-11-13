from common.artefact_enum import Artefact
from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.KEYWORD_STATISTICS,
    requires_artefacts={Artefact.KEYWORDS},
    requires_features=set(),
)
