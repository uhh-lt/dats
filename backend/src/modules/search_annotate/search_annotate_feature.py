from common.artefact_enum import Artefact
from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.SEARCH_ANNOTATE,
    title="Search & auto-annotate",
    description="Search a phrase in all documents and annotate the matches at once.",
    requires_artefacts={Artefact.ES_INDEX},
    requires_features=set(),
)
