from core.artefacts.word_frequencies.word_frequencies_artefact import (
    WORD_FREQUENCIES,
)
from systems.feature_system.feature_registry import register_feature
from systems.feature_system.feature_system_enum import FeatureArea

DUPLICATE_FINDER = register_feature(
    "duplicate_finder",
    title="Duplicate Finder",
    description="Find documents with (almost) the same words.",
    area=FeatureArea.ANALYSIS,
    requires_artefacts={WORD_FREQUENCIES},
)
