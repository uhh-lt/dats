"""Renders prompts: fills the blocks and splits documents into messages.

Everything a prompt sends to the LLM is decided here, so the Prompts page, the
LLM Assistant and its parsers see exactly the same prompt.
"""

import re
from dataclasses import dataclass

from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.prompt.prompt_blocks import (
    CONTEXT_EXAMPLE_LABELS,
    INLINE_EXAMPLE_LABELS,
    METADATA_ANSWER_TEMPLATES,
    METADATA_EXAMPLE_VALUES,
    OUTPUT_FORMAT_INSTRUCTIONS,
    SENTENCE_EXAMPLES_HEADERS,
)
from core.prompt.prompt_dto import (
    PromptCode,
    PromptSnapshot,
    SentencePromptExample,
    SpanPromptExample,
)
from core.prompt.prompt_enum import (
    DocumentUnit,
    OutputFormat,
    PromptBlock,
)
from core.prompt.prompt_specs import (
    document_placeholder,
    output_format_placeholder,
)

# empty blocks must not leave gaps of blank lines in the prompt
_BLANK_LINES = re.compile(r"\n{3,}")


@dataclass(frozen=True)
class PromptSegment:
    """The part of a document that one LLM message shows."""

    # character offsets of the part within the document
    begin: int
    end: int
    # the text that replaces <document:unit>
    text: str
    # the sentences of the part (sentence numbers are sentence index + 1)
    sentence_ids: tuple[int, ...]


def fill_placeholders(template: str, values: dict[str, str]) -> str:
    """Replace all placeholders of a template in a single pass.

    Inserted values are never scanned again, so a document or a code description
    that contains a placeholder text (e.g. "<codes>") is inserted verbatim.
    """
    if not values:
        return template
    pattern = re.compile("|".join(re.escape(placeholder) for placeholder in values))
    return pattern.sub(lambda match: values[match.group(0)], template)


class PromptRenderer:
    """Renders one prompt (a validated version or draft) for documents.

    Args:
        prompt: The prompt to render.
        document_unit: The unit of its <document:unit> block.
        output_format: The format of its <output-format:format> block.
    """

    def __init__(
        self,
        prompt: PromptSnapshot,
        document_unit: DocumentUnit,
        output_format: OutputFormat,
    ):
        self.prompt = prompt
        self.document_unit = document_unit
        self.output_format = output_format
        self.blocks = self._render_blocks()
        # everything but the document is the same for every message; the parts
        # around the document are filled separately, so block texts are never
        # scanned for the document placeholder
        before, _, after = prompt.text.partition(document_placeholder(document_unit))
        self.prompt_before_document = _BLANK_LINES.sub(
            "\n\n", fill_placeholders(before, self.blocks)
        ).lstrip()
        self.prompt_after_document = _BLANK_LINES.sub(
            "\n\n", fill_placeholders(after, self.blocks)
        ).rstrip()

    # BLOCKS

    @property
    def is_fewshot(self) -> bool:
        """The prompt shows at least one few-shot example."""
        return self.blocks.get(PromptBlock.EXAMPLES.value, "") != ""

    def render_code_name(self, code: PromptCode) -> str:
        """Render the name of a code as the LLM sees (and answers) it."""
        if self.output_format in (OutputFormat.INLINE, OutputFormat.CONTEXT):
            return code.name.upper()
        return code.name

    def _render_blocks(self) -> dict[str, str]:
        """The text of every block except the document, by placeholder."""
        prompt = self.prompt
        blocks = {
            output_format_placeholder(self.output_format): self._render_instructions(),
            PromptBlock.CODES.value: "\n".join(
                f"{self.render_code_name(code)}: {code.description}"
                for code in prompt.codes
            ),
            PromptBlock.CODE_NAMES.value: ", ".join(
                self.render_code_name(code) for code in prompt.codes
            ),
            PromptBlock.EXAMPLES.value: self._render_examples(),
            PromptBlock.TAGS.value: "\n".join(
                f"{tag.name} - {tag.description}" for tag in prompt.tags
            ),
            PromptBlock.METADATA_FIELDS.value: "\n".join(
                f"{field.key} - {field.description}" for field in prompt.metadata_fields
            ),
        }
        return {
            placeholder: text
            for placeholder, text in blocks.items()
            if placeholder in prompt.text
        }

    def _render_instructions(self) -> str:
        settings = self.prompt.settings
        fields = self.prompt.metadata_fields
        return OUTPUT_FORMAT_INSTRUCTIONS[self.output_format][
            self.prompt.language
        ].format(
            context_before_chars=settings.context_before_chars,
            context_after_chars=settings.context_after_chars,
            metadata_answer_template="\n".join(
                f"{field.key}: {METADATA_ANSWER_TEMPLATES[field.metatype]}"
                for field in fields
            ),
            metadata_example="\n".join(
                f"{field.key}: {METADATA_EXAMPLE_VALUES[field.metatype]}"
                for field in fields
            ),
        )

    def _render_examples(self) -> str:
        """Render the examples of the selected codes, "" if there are none."""
        match self.output_format:
            case OutputFormat.INLINE:
                return self._render_inline_examples()
            case OutputFormat.CONTEXT:
                return self._render_context_examples()
            case OutputFormat.SENTENCES:
                return self._render_sentence_examples()
            case _:
                return ""

    def _selected_spans(
        self, example: SpanPromptExample
    ) -> list[tuple[PromptCode, int, int]]:
        """The non-overlapping spans of the selected codes, sorted by begin."""
        codes = {code.code_id: code for code in self.prompt.codes}
        spans: list[tuple[PromptCode, int, int]] = []
        for span in sorted(example.spans, key=lambda span: (span.begin, span.end)):
            if span.code_id not in codes:
                continue
            if spans and span.begin < spans[-1][2]:
                continue
            spans.append((codes[span.code_id], span.begin, span.end))
        return spans

    def _span_examples(self) -> list[SpanPromptExample]:
        return [
            example
            for example in self.prompt.examples
            if isinstance(example, SpanPromptExample)
        ]

    def _render_inline_examples(self) -> str:
        labels = INLINE_EXAMPLE_LABELS[self.prompt.language]
        rendered: list[str] = []
        for example in self._span_examples():
            spans = self._selected_spans(example)
            if not spans:
                continue
            tagged = ""
            cursor = 0
            for code, begin, end in spans:
                name = self.render_code_name(code)
                tagged += (
                    example.text[cursor:begin]
                    + f"<{name}>{example.text[begin:end]}</{name}>"
                )
                cursor = end
            tagged += example.text[cursor:]
            rendered.append(
                f"{labels['input']}:\n{example.text}\n{labels['output']}:\n{tagged}"
            )
        if not rendered:
            return ""
        return f"{labels['header']}\n" + "\n\n".join(rendered)

    def _render_context_examples(self) -> str:
        labels = CONTEXT_EXAMPLE_LABELS[self.prompt.language]
        before_chars = self.prompt.settings.context_before_chars
        after_chars = self.prompt.settings.context_after_chars
        rendered: list[str] = []
        for example in self._span_examples():
            spans = self._selected_spans(example)
            if not spans:
                continue
            text = example.text
            passages = [
                f"{labels['category']}: {self.render_code_name(code)}\n"
                f"{labels['quote']}: {text[begin:end]}\n"
                f"{labels['context_before']}: "
                f"{text[max(0, begin - before_chars) : begin]}\n"
                f"{labels['context_after']}: {text[end : end + after_chars]}"
                for code, begin, end in spans
            ]
            rendered.append(
                f"{labels['text']}:\n{text}\n\n{labels['passages']}:\n"
                + "\n\n".join(passages)
            )
        if not rendered:
            return ""
        return f"{labels['header']}\n\n" + "\n\n---\n\n".join(rendered)

    def _render_sentence_examples(self) -> str:
        examples_by_code: dict[int, list[str]] = {
            code.code_id: [] for code in self.prompt.codes
        }
        for example in self.prompt.examples:
            if (
                isinstance(example, SentencePromptExample)
                and example.code_id in examples_by_code
            ):
                examples_by_code[example.code_id].append(example.text)
        rendered = [
            f"{self.render_code_name(code)}:\n"
            + "\n".join(f"- {text}" for text in examples_by_code[code.code_id])
            for code in self.prompt.codes
            if examples_by_code[code.code_id]
        ]
        if not rendered:
            return ""
        return f"{SENTENCE_EXAMPLES_HEADERS[self.prompt.language]}\n" + "\n\n".join(
            rendered
        )

    # DOCUMENTS

    def render(self, segment: PromptSegment) -> str:
        """Render the prompt of one segment of a document."""
        return self.prompt_before_document + segment.text + self.prompt_after_document

    def render_without_document(self) -> str:
        """Render the prompt with the document block kept as it is."""
        return (
            self.prompt_before_document
            + document_placeholder(self.document_unit)
            + self.prompt_after_document
        )

    def segments(self, sdoc_data: SourceDocumentDataORM) -> list[PromptSegment]:
        """Split a document into the segments of its LLM messages."""
        match self.document_unit:
            case DocumentUnit.WHOLE:
                ranges = [(0, len(sdoc_data.content))]
            case DocumentUnit.SENTENCES:
                ranges = list(sdoc_data.sentence_character_offsets)
            case DocumentUnit.CHUNKS:
                ranges = self._chunk_ranges(sdoc_data)
        segments = [self._segment(sdoc_data, begin, end) for begin, end in ranges]
        if self.output_format == OutputFormat.SENTENCES:
            # a part without the start of a sentence shows no numbered sentence
            return [segment for segment in segments if segment.sentence_ids]
        return segments

    def _segment(
        self, sdoc_data: SourceDocumentDataORM, begin: int, end: int
    ) -> PromptSegment:
        # the sentences that start within the part
        sentence_ids = tuple(
            sentence_id
            for sentence_id, start in enumerate(sdoc_data.sentence_starts)
            if begin <= start < end
        )
        if self.output_format != OutputFormat.SENTENCES:
            return PromptSegment(
                begin=begin,
                end=end,
                text=sdoc_data.content[begin:end],
                sentence_ids=sentence_ids,
            )

        # sentence answers refer to the numbers of whole sentences
        sentences = sdoc_data.sentences
        return PromptSegment(
            begin=sdoc_data.sentence_starts[sentence_ids[0]] if sentence_ids else begin,
            end=sdoc_data.sentence_ends[sentence_ids[-1]] if sentence_ids else end,
            text="\n".join(
                f"{sentence_id + 1}: {sentences[sentence_id]}"
                for sentence_id in sentence_ids
            ),
            sentence_ids=sentence_ids,
        )

    def _chunk_ranges(self, sdoc_data: SourceDocumentDataORM) -> list[tuple[int, int]]:
        """Split the document into overlapping token windows (character ranges)."""
        token_starts = sdoc_data.token_starts
        token_ends = sdoc_data.token_ends
        num_tokens = len(token_starts)
        size = self.prompt.settings.chunk_size_tokens
        if num_tokens <= size:
            return [(0, len(sdoc_data.content))]

        step = size - self.prompt.settings.chunk_overlap_tokens
        num_chunks = (num_tokens - size + step - 1) // step + 1
        ranges: list[tuple[int, int]] = []
        for chunk_id in range(num_chunks):
            start_token = chunk_id * step
            end_token = min(start_token + size, num_tokens)
            ranges.append((token_starts[start_token], token_ends[end_token - 1]))
        return ranges
