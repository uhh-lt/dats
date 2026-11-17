from modules.statistics.keywords_artefact import KEYWORDS, create_keywords_metadata
from systems.feature_system.feature_registry import register_feature
from systems.feature_system.feature_system_enum import FeatureArea

KEYWORD_STATISTICS = register_feature(
    "keyword_statistics",
    title="Keyword Statistics and Filter",
    description="Extract the keywords of each document, to count them and filter documents by them.",
    area=FeatureArea.ANALYSIS,
    requires_artefacts={KEYWORDS},
    set_up=create_keywords_metadata,
)
