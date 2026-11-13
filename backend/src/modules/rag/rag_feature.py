from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.RAG_CHAT,
    requires_artefacts=set(),
    requires_features={Feature.SENTENCE_SIMILARITY_SEARCH},
)
