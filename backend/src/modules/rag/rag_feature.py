from common.feature_enum import FeatureArea
from modules.simsearch.simsearch_feature import SENTENCE_SIMILARITY_SEARCH
from systems.feature_system.feature_registry import register_feature

RAG_CHAT = register_feature(
    "rag_chat",
    title="RAG Chat",
    description="Ask questions about the documents; the answers cite the most similar sentences.",
    area=FeatureArea.ANALYSIS,
    requires_features={SENTENCE_SIMILARITY_SEARCH},
)
