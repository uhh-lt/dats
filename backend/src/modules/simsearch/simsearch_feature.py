from common.artefact_enum import Artefact
from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.SENTENCE_SIMILARITY_SEARCH,
    requires_artefacts={Artefact.SENTENCE_EMBEDDINGS},
    requires_features=set(),
)

register_feature(
    Feature.IMAGE_SIMILARITY_SEARCH,
    requires_artefacts={Artefact.IMAGE_EMBEDDINGS},
    requires_features=set(),
)
