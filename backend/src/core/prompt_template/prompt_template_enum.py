from enum import Enum


class TaskType(str, Enum):
    """What an LLM does with the documents (and what a prompt template is for)."""

    TAGGING = "TAGGING"
    METADATA_EXTRACTION = "METADATA_EXTRACTION"
    ANNOTATION = "ANNOTATION"
    SENTENCE_ANNOTATION = "SENTENCE_ANNOTATION"


class DocumentUnit(str, Enum):
    """How a document is split into LLM calls, chosen with <document:unit>."""

    WHOLE = "whole"
    SENTENCES = "sentences"
    CHUNKS = "chunks"


class OutputFormat(str, Enum):
    """The answer format the LLM must follow, chosen with <output-format:format>.

    The format decides the fixed answer instructions of the prompt, the structured
    output schema and how the answers are parsed.
    """

    INLINE = "inline"
    CONTEXT = "context"
    SENTENCES = "sentences"
    TAGS = "tags"
    METADATA = "metadata"


class PromptBlock(str, Enum):
    """The blocks of a prompt besides the document and the output format.

    Each block is filled with a selection stored in the template version (codes,
    examples, tags, metadata fields).
    """

    CODES = "<codes>"
    CODE_NAMES = "<code_names>"
    EXAMPLES = "<examples>"
    TAGS = "<tags>"
    METADATA_FIELDS = "<metadata_fields>"


class PromptLanguage(str, Enum):
    """The language of a prompt template; it decides the text of the blocks."""

    EN = "en"
    DE = "de"


class PromptExampleKind(str, Enum):
    """The kind of annotation a few-shot example of a prompt template shows."""

    SPAN = "SPAN"
    SENTENCE = "SENTENCE"
