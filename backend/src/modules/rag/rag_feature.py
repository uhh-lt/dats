from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.RAG_CHAT,
    title="RAG chat",
    description="Ask questions about the documents; the answers cite the most similar sentences.",
    requires_artefacts=set(),
    requires_features={Feature.SENTENCE_SIMILARITY_SEARCH},
)
