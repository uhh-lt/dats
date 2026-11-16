from common.feature_enum import FeatureArea
from core.doc_processing.artefacts import ES_INDEX
from systems.feature_system.feature_registry import register_feature

SEARCH_ANNOTATE = register_feature(
    "search_annotate",
    title="Search & Auto-Annotate",
    description="Search a phrase in all documents and annotate the matches at once.",
    area=FeatureArea.SEARCH,
    requires_artefacts={ES_INDEX},
)
