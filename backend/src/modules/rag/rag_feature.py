from core.artefacts.sentence_embeddings.sentence_embeddings_artefact import (
    SENTENCE_EMBEDDINGS,
)
from systems.feature_system.feature_registry import register_feature
from systems.feature_system.feature_system_enum import FeatureArea

RAG_CHAT = register_feature(
    "rag_chat",
    title="RAG Chat",
    description="Ask questions about the documents; the answers cite the most similar sentences.",
    area=FeatureArea.ANALYSIS,
    requires_artefacts={SENTENCE_EMBEDDINGS},
)
