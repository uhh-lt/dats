from common.feature_enum import FeatureArea
from modules.statistics.keywords_artefact import KEYWORDS
from systems.feature_system.feature_registry import register_feature

KEYWORD_STATISTICS = register_feature(
    "keyword_statistics",
    title="Keyword Statistics and Filter",
    description="Extract the keywords of each document, to count them and filter documents by them.",
    area=FeatureArea.ANALYSIS,
    requires_artefacts={KEYWORDS},
)
