from common.artefact_enum import Artefact
from common.feature_enum import FeatureArea
from systems.feature_system.feature_registry import register_feature

KEYWORD_STATISTICS = register_feature(
    "keyword_statistics",
    title="Keyword Statistics and Filter",
    description="Extract the keywords of each document, to count them and filter documents by them.",
    area=FeatureArea.ANALYSIS,
    requires_artefacts={Artefact.KEYWORDS},
)
