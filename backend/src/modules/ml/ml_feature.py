from common.artefact_enum import Artefact
from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.TAG_RECOMMENDATION,
    title="Tag recommendation",
    description="Get tag suggestions for untagged documents based on similar tagged documents.",
    requires_artefacts={Artefact.DOCUMENT_EMBEDDINGS},
    requires_features=set(),
)
