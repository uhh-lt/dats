from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.ANNOTATION_SCALING,
    title="Annotation scaling",
    description="Get suggestions for sentences similar to the ones you annotated and accept or reject them.",
    requires_artefacts=set(),
    requires_features={Feature.SENTENCE_SIMILARITY_SEARCH},
)
