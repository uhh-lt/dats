from common.artefact_enum import Artefact
from common.feature_enum import FeatureArea
from systems.feature_system.feature_registry import register_feature

TAG_RECOMMENDATION = register_feature(
    "tag_recommendation",
    title="Tag Recommendations",
    description="Get tag suggestions for untagged documents based on similar tagged documents.",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_artefacts={Artefact.DOCUMENT_EMBEDDINGS},
)
