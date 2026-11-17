from common.feature_enum import FeatureArea
from core.artefacts.sentence_embeddings.sentence_embeddings_artefact import (
    SENTENCE_EMBEDDINGS,
)
from systems.feature_system.feature_registry import register_feature

CONCEPTS_OVER_TIME = register_feature(
    "concepts_over_time",
    title="Concepts Over Time Analysis",
    description="Track how often concepts, described by example sentences, occur over time.",
    area=FeatureArea.ANALYSIS,
    requires_artefacts={SENTENCE_EMBEDDINGS},
)
