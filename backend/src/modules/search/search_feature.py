from common.feature_enum import FeatureArea
from modules.doc_processing.artefacts import ES_INDEX
from systems.feature_system.feature_registry import register_feature

FULL_TEXT_SEARCH = register_feature(
    "full_text_search",
    title="Full-Text Search",
    description="Search the text of the documents with keywords and phrases. Without it, documents can still be searched with filters.",
    area=FeatureArea.SEARCH,
    requires_artefacts={ES_INDEX},
)
