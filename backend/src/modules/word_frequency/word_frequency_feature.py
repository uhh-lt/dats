from core.artefacts.word_frequencies.word_frequencies_artefact import (
    WORD_FREQUENCIES,
)
from systems.feature_system.feature_registry import register_feature
from systems.feature_system.feature_system_enum import FeatureArea

WORD_FREQUENCY = register_feature(
    "word_frequency",
    title="Word Frequency Analysis",
    description="Count and compare the words of the documents.",
    area=FeatureArea.ANALYSIS,
    requires_artefacts={WORD_FREQUENCIES},
)
