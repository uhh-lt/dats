from common.artefact_enum import Artefact
from common.feature_enum import FeatureArea
from systems.feature_system.feature_registry import register_feature

SENTENCE_SIMILARITY_SEARCH = register_feature(
    "sentence_similarity_search",
    title="Sentence Search",
    description="Find sentences that are similar in meaning.",
    area=FeatureArea.SEARCH,
    requires_artefacts={Artefact.SENTENCE_EMBEDDINGS},
)

IMAGE_SIMILARITY_SEARCH = register_feature(
    "image_similarity_search",
    title="Image Search",
    description="Find images that are similar to a text or another image.",
    area=FeatureArea.SEARCH,
    requires_artefacts={Artefact.IMAGE_EMBEDDINGS},
)
