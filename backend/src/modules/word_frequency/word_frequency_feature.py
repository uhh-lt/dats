from common.artefact_enum import Artefact
from common.feature_enum import FeatureArea
from systems.feature_system.feature_registry import register_feature

WORD_FREQUENCY = register_feature(
    "word_frequency",
    title="Word Frequency Analysis",
    description="Count and compare the words of the documents.",
    area=FeatureArea.ANALYSIS,
    requires_artefacts={Artefact.WORD_FREQUENCIES},
)
