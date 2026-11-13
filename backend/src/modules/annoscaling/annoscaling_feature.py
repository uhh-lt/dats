from common.feature_enum import FeatureArea
from modules.simsearch.simsearch_feature import SENTENCE_SIMILARITY_SEARCH
from systems.feature_system.feature_registry import register_feature

ANNOTATION_SCALING = register_feature(
    "annotation_scaling",
    title="Annotation Scaling",
    description="Get suggestions for sentences similar to the ones you annotated and accept or reject them.",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_features={SENTENCE_SIMILARITY_SEARCH},
)
