from common.artefact_enum import Artefact
from common.feature_enum import Feature
from systems.feature_system.feature_registry import register_feature

register_feature(
    Feature.SENTENCE_SIMILARITY_SEARCH,
    title="Sentence similarity search",
    description="Find sentences that are similar in meaning.",
    requires_artefacts={Artefact.SENTENCE_EMBEDDINGS},
    requires_features=set(),
)

register_feature(
    Feature.IMAGE_SIMILARITY_SEARCH,
    title="Image similarity search",
    description="Find images that are similar to a text or another image.",
    requires_artefacts={Artefact.IMAGE_EMBEDDINGS},
    requires_features=set(),
)
