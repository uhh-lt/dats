from common.feature_enum import FeatureArea
from core.doc_processing.artefacts import SENTENCE_EMBEDDINGS
from modules.simsearch.image_embedding_artefact import IMAGE_EMBEDDINGS
from systems.feature_system.feature_registry import register_feature

SEMANTIC_SEARCH = register_feature(
    "semantic_search",
    title="Semantic Search",
    description="Find sentences and images that are similar in meaning to a text, a sentence or an image.",
    area=FeatureArea.SEARCH,
    requires_artefacts={SENTENCE_EMBEDDINGS, IMAGE_EMBEDDINGS},
)
