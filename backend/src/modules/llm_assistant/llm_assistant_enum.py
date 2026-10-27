from enum import Enum


class TaskType(str, Enum):
    TAGGING = "TAGGING"
    METADATA_EXTRACTION = "METADATA_EXTRACTION"
    ANNOTATION = "ANNOTATION"
    SENTENCE_ANNOTATION = "SENTENCE_ANNOTATION"


class ApproachType(str, Enum):
    LLM_ZERO_SHOT = "LLM_ZERO_SHOT"
    LLM_FEW_SHOT = "LLM_FEW_SHOT"


class StrategyType(str, Enum):
    TAGGING_DEFAULT = "TAGGING_DEFAULT"
    METADATA_DEFAULT = "METADATA_DEFAULT"
    SENTENCE_ANNOTATION_DEFAULT = "SENTENCE_ANNOTATION_DEFAULT"
    NER_INLINE_TAGS = "NER_INLINE_TAGS"
    CONTEXT_ANCHORED_FUZZY_MATCHING = "CONTEXT_ANCHORED_FUZZY_MATCHING"


class DataTag(str, Enum):
    """Placeholder tags used in LLM user prompt templates.

    A user prompt template must contain exactly one of these tags. At prompt
    building time, the tag is replaced with the corresponding document data
    (full content, individual sentences, or chunks). The tag also determines
    how the document is split into individual LLM calls.
    """

    DOCUMENT = "<document>"
    SENTENCE = "<sentence>"
    CHUNK = "<chunk>"


class PromptPlaceholder(str, Enum):
    """Placeholder tags used in LLM prompt templates besides the data tags.

    The project placeholders may appear in the system prompt. The codes
    placeholder is required in the user prompt of every strategy that works
    with code definitions; the strategy renders it from the code definitions
    (id, name, description) in its own format.
    """

    PROJECT_TITLE = "<project_title>"
    PROJECT_DESCRIPTION = "<project_description>"
    CODES = "<codes>"


class GroundingMethod(str, Enum):
    ANCHORED_EXACT = "anchored exact"
    QUOTE_EXACT = "quote exact"
    FUZZY = "fuzzy"
