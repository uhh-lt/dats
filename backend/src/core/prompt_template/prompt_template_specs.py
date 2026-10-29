"""The block rules of the prompt templates of every task.

A prompt contains exactly one <document:unit> block, exactly one
<output-format:format> block and the selection blocks of its task. These specs
are the single source of truth for validating templates and for explaining the
blocks to users.
"""

from dataclasses import dataclass

from core.prompt_template.prompt_template_enum import (
    DocumentUnit,
    OutputFormat,
    PromptBlock,
    PromptExampleKind,
    PromptLanguage,
    TaskType,
)


@dataclass(frozen=True)
class PromptTaskSpec:
    # the answer formats a template of the task can ask for (the first is the default)
    output_formats: tuple[OutputFormat, ...]
    # the units a template of the task can split documents into
    document_units: tuple[DocumentUnit, ...]
    # the selection blocks a template of the task may contain
    blocks: tuple[PromptBlock, ...]
    # the prompt must contain at least one of these blocks
    required_blocks: tuple[PromptBlock, ...]
    # the kind of few-shot examples, None if the task supports none
    example_kind: PromptExampleKind | None


@dataclass(frozen=True)
class OutputFormatSpec:
    task_type: TaskType
    name: str
    description: str
    # markdown: how the format works, an example and when to use it
    details: str
    # the document unit of the default template
    default_document_unit: DocumentUnit
    # used to name the default prompts: default-<slug>-<language>
    default_name_slug: str


PROMPT_TASK_SPECS: dict[TaskType, PromptTaskSpec] = {
    TaskType.TAGGING: PromptTaskSpec(
        output_formats=(OutputFormat.TAGS,),
        # tags describe the whole document, answers of parts cannot be merged
        document_units=(DocumentUnit.WHOLE,),
        blocks=(PromptBlock.TAGS,),
        required_blocks=(PromptBlock.TAGS,),
        example_kind=None,
    ),
    TaskType.METADATA_EXTRACTION: PromptTaskSpec(
        output_formats=(OutputFormat.METADATA,),
        # metadata describes the whole document, answers of parts cannot be merged
        document_units=(DocumentUnit.WHOLE,),
        blocks=(PromptBlock.METADATA_FIELDS,),
        required_blocks=(PromptBlock.METADATA_FIELDS,),
        example_kind=None,
    ),
    TaskType.SENTENCE_ANNOTATION: PromptTaskSpec(
        output_formats=(OutputFormat.SENTENCES,),
        document_units=tuple(DocumentUnit),
        blocks=(PromptBlock.CODES, PromptBlock.CODE_NAMES, PromptBlock.EXAMPLES),
        required_blocks=(PromptBlock.CODES, PromptBlock.CODE_NAMES),
        example_kind=PromptExampleKind.SENTENCE,
    ),
    TaskType.ANNOTATION: PromptTaskSpec(
        output_formats=(OutputFormat.INLINE, OutputFormat.CONTEXT),
        document_units=tuple(DocumentUnit),
        blocks=(PromptBlock.CODES, PromptBlock.CODE_NAMES, PromptBlock.EXAMPLES),
        required_blocks=(PromptBlock.CODES, PromptBlock.CODE_NAMES),
        example_kind=PromptExampleKind.SPAN,
    ),
}

OUTPUT_FORMAT_SPECS: dict[OutputFormat, OutputFormatSpec] = {
    OutputFormat.TAGS: OutputFormatSpec(
        task_type=TaskType.TAGGING,
        name="Document tags",
        description=(
            "The LLM selects the tags that apply to the document and briefly "
            "explains its selection."
        ),
        details=(
            "The LLM selects the tags that apply to the document.\n"
            "\n"
            "**How it works:** The LLM sees the document along with the selected "
            "tags (name and description). It selects which tags apply and gives a "
            "short explanation for each.\n"
            "\n"
            "**Example:** Given the tags `News` and `Sports` and a document about "
            "a football match, the answer is:\n"
            "\n"
            "    Category: Sports\n"
            "    Explanation: The document discusses a football match result.\n"
            "\n"
            "**When to use:** For sorting documents into a flat set of tags."
        ),
        default_document_unit=DocumentUnit.WHOLE,
        default_name_slug="document-tagging",
    ),
    OutputFormat.METADATA: OutputFormatSpec(
        task_type=TaskType.METADATA_EXTRACTION,
        name="Metadata values",
        description=(
            "The LLM returns a value for each selected metadata field, in the "
            "format of the field's type."
        ),
        details=(
            "The LLM extracts a value for each selected metadata field.\n"
            "\n"
            "**How it works:** The LLM sees the document along with the selected "
            "metadata fields (key and description). It returns one value per "
            "field, in the format of the field's type; DATS reads the values into "
            "the document's metadata.\n"
            "\n"
            "**Example:** Given the fields `author` and `date` and a news "
            "article, the answer is:\n"
            "\n"
            "    author: Jane Doe\n"
            "    date: 2024-01-15\n"
            "\n"
            "**When to use:** For extracting structured information such as author, "
            "date or source from documents."
        ),
        default_document_unit=DocumentUnit.WHOLE,
        default_name_slug="metadata-extraction",
    ),
    OutputFormat.SENTENCES: OutputFormatSpec(
        task_type=TaskType.SENTENCE_ANNOTATION,
        name="Sentence numbers",
        description=(
            "The document is shown with numbered sentences. The LLM returns the "
            "number and the code of each sentence that fits a code."
        ),
        details=(
            "The LLM classifies the sentences of the document with the selected "
            "codes.\n"
            "\n"
            "**How it works:** The document is shown with numbered sentences. The "
            "LLM answers with the number and the code of each sentence that fits a "
            "code and leaves out the others. DATS annotates the sentences with "
            "these numbers.\n"
            "\n"
            "**Example:** Given the codes `Claim` and `Evidence` and the "
            "sentences:\n"
            "\n"
            "    1: Climate change is real.\n"
            "    2: Global temperatures rose by 1.1 \u00b0C since 1880.\n"
            "\n"
            "The answer is:\n"
            "\n"
            "    Sentence ID: 1\n"
            "    Category: Claim\n"
            "    Sentence ID: 2\n"
            "    Category: Evidence\n"
            "\n"
            "**When to use:** For sentence-level classification such as argument "
            "mining, stance detection or discourse analysis."
        ),
        default_document_unit=DocumentUnit.WHOLE,
        default_name_slug="sentence-annotation",
    ),
    OutputFormat.INLINE: OutputFormatSpec(
        task_type=TaskType.ANNOTATION,
        name="Inline tags",
        description=(
            "The LLM repeats the text and wraps relevant passages in tags named "
            "after the codes, e.g. The <EVIDENCE>survey results</EVIDENCE> support "
            "the proposal. Best for short texts the LLM can repeat exactly."
        ),
        details=(
            "The LLM repeats the original text and wraps relevant passages in "
            "inline tags.\n"
            "\n"
            "**How it works:** The LLM is asked to repeat the text it receives "
            "verbatim, wrapping each relevant passage in XML-like tags named after "
            "the codes. DATS reads the tags and computes the exact character "
            "offsets of the passages.\n"
            "\n"
            "**Example:** Given the code `Evidence` and the input text:\n"
            "\n"
            "    The survey results support the proposal.\n"
            "\n"
            "The tagged answer is:\n"
            "\n"
            "    The <EVIDENCE>survey results</EVIDENCE> support the proposal.\n"
            "\n"
            "**When to use:** Best for short texts the LLM can reliably repeat: "
            "short documents, or longer ones sent sentence by sentence."
        ),
        default_document_unit=DocumentUnit.WHOLE,
        default_name_slug="span-annotation-inline-tagging",
    ),
    OutputFormat.CONTEXT: OutputFormatSpec(
        task_type=TaskType.ANNOTATION,
        name="Quotes with context",
        description=(
            "The LLM returns the code, an exact quote and a few characters of "
            "context before and after it; the quote is then located in the text, "
            "fuzzy if needed. More robust for long texts and repeated passages."
        ),
        details=(
            "The LLM extracts relevant passages as quotes; DATS locates them in the "
            "document.\n"
            "\n"
            "**How it works:** For each relevant passage, the LLM returns the code, "
            "an exact quote and a few characters of context before and after it. "
            "DATS locates the quote in the text it sent, exactly or, if that "
            "fails, by fuzzy matching with the context as an anchor.\n"
            "\n"
            "**Example:** Given the code `Claim` and the input text:\n"
            "\n"
            "    The report concludes that the policy reduced emissions "
            "substantially.\n"
            "\n"
            "An extracted passage is:\n"
            "\n"
            "    Category: CLAIM\n"
            "    Exact quote: the policy reduced emissions\n"
            "    Context before: concludes that\n"
            "    Context after: substantially\n"
            "\n"
            "**When to use:** Best for long documents, repeated or similar "
            "passages, or when the LLM struggles to repeat text verbatim. Usually "
            "sent in chunks, which needs more LLM calls."
        ),
        default_document_unit=DocumentUnit.CHUNKS,
        default_name_slug="span-annotation-context-anchored-extraction",
    ),
}

DOCUMENT_UNIT_DESCRIPTIONS: dict[DocumentUnit, str] = {
    DocumentUnit.WHOLE: "The whole document; the LLM is called once per document.",
    DocumentUnit.SENTENCES: (
        "One sentence at a time; the LLM is called once per sentence."
    ),
    DocumentUnit.CHUNKS: (
        "Overlapping chunks of the document (chunk size and overlap in tokens); "
        "the LLM is called once per chunk."
    ),
}

BLOCK_DESCRIPTIONS: dict[PromptBlock, str] = {
    PromptBlock.CODES: (
        "The selected codes, one line per code with its name and description."
    ),
    PromptBlock.CODE_NAMES: "The names of the selected codes, separated by commas.",
    PromptBlock.EXAMPLES: (
        "The few-shot examples of the selected codes. A prompt with examples makes "
        "a few-shot run."
    ),
    PromptBlock.TAGS: (
        "The selected tags, one line per tag with its name and description."
    ),
    PromptBlock.METADATA_FIELDS: (
        "The selected metadata fields, one line per field with its key and description."
    ),
}


def document_placeholder(unit: DocumentUnit) -> str:
    """The block that inserts the document, e.g. <document:whole>."""
    return f"<document:{unit.value}>"


def output_format_placeholder(output_format: OutputFormat) -> str:
    """The block that inserts the answer instructions, e.g. <output-format:inline>."""
    return f"<output-format:{output_format.value}>"


def default_prompt_name(output_format: OutputFormat, language: PromptLanguage) -> str:
    """The name of the default prompt that every project gets, e.g. default-sentence-annotation-en."""
    return f"default-{OUTPUT_FORMAT_SPECS[output_format].default_name_slug}-{language.value}"
