from core.artefacts.sentence_embeddings.sentence_embeddings_artefact import (
    SENTENCE_EMBEDDINGS,
)
from systems.feature_system.feature_registry import register_feature
from systems.feature_system.feature_system_enum import FeatureArea

ANNOTATION_SCALING = register_feature(
    "annotation_scaling",
    title="Annotation Scaling",
    description="Get suggestions for sentences similar to the ones you annotated and accept or reject them.",
    area=FeatureArea.AUTOMATIC_ANNOTATION,
    requires_artefacts={SENTENCE_EMBEDDINGS},
)
