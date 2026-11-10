from common.artefact_enum import Artefact
from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.DUPLICATE_FINDER,
    title="Duplicate finder",
    description="Find documents with (almost) the same words.",
    requires_artefacts={Artefact.WORD_FREQUENCIES},
    requires_features=set(),
)
