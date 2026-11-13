from enum import Enum


class Feature(str, Enum):
    """A user-facing capability that a project can enable or disable. Each feature
    is declared with `register_feature` in a `*_feature.py` file of its module.

    Only toggleable features are listed: the features that need core data only
    (annotation, LLM assistant, classifier, perspectives, ...) are always available."""

    FULL_TEXT_SEARCH = "full_text_search"
    SEARCH_ANNOTATE = "search_annotate"
    SENTENCE_SIMILARITY_SEARCH = "sentence_similarity_search"
    IMAGE_SIMILARITY_SEARCH = "image_similarity_search"
    RAG_CHAT = "rag_chat"
    ANNOTATION_SCALING = "annotation_scaling"
    CONCEPTS_OVER_TIME = "concepts_over_time"
    TAG_RECOMMENDATION = "tag_recommendation"
    WORD_FREQUENCY = "word_frequency"
    DUPLICATE_FINDER = "duplicate_finder"
    KEYWORD_STATISTICS = "keyword_statistics"
    ENTITY_ANNOTATIONS = "entity_annotations"
    IMAGE_CAPTIONS = "image_captions"
    OBJECT_DETECTION = "object_detection"


class FeatureStatus(str, Enum):
    """The state of a feature in a project, derived from the step statuses of its
    documents."""

    DISABLED = "disabled"
    COMPUTING = "computing"  # enabled, some documents are still processing
    PARTLY_AVAILABLE = "partly_available"  # enabled, some documents lack the data and nothing runs for them
    FULLY_AVAILABLE = "fully_available"  # enabled, all documents have the data
