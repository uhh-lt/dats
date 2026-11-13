from common.artefact_enum import Artefact
from common.feature_enum import FeatureArea
from systems.feature_system.feature_registry import register_feature

SEARCH_ANNOTATE = register_feature(
    "search_annotate",
    title="Search & Auto-Annotate",
    description="Search a phrase in all documents and annotate the matches at once.",
    area=FeatureArea.SEARCH,
    requires_artefacts={Artefact.ES_INDEX},
)
