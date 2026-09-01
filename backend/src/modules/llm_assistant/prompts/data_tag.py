from enum import Enum


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
