from common.feature_enum import FeatureArea
from modules.tag_recommendation.document_embedding_artefact import DOCUMENT_EMBEDDINGS
from systems.feature_system.feature_registry import register_feature

TAG_RECOMMENDATION = register_feature(
    "tag_recommendation",
    title="Tag Recommendations",
    description="Get tag suggestions for untagged documents based on similar tagged documents.",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_artefacts={DOCUMENT_EMBEDDINGS},
)
