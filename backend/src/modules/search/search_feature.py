from common.artefact_enum import Artefact
from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.FULL_TEXT_SEARCH,
    title="Full-text search",
    description="Search the text of the documents with keywords and phrases. Without it, documents can still be searched with filters.",
    requires_artefacts={Artefact.ES_INDEX},
    requires_features=set(),
)
