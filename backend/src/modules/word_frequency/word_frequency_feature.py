from common.artefact_enum import Artefact
from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.WORD_FREQUENCY,
    requires_artefacts={Artefact.WORD_FREQUENCIES},
    requires_features=set(),
)
