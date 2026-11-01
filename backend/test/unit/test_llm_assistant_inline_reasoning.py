"""Unit tests for the reasoning matching of NERInlineTagStrategy.parse_result.

With ``request_reasoning``, the inline answer has the tagged text and a list of
(passage, reasoning) pairs. Each tag gets the reasoning of its passage, matched by
text without inline tags, with collapsed whitespace and case-insensitively, in
answer order for repeated passages.
"""

import pytest

# imports every ORM, so the mappers of the document data ORM can be configured
import repos.db.sql_repo  # noqa: F401
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.prompt.prompt_defaults import DEFAULT_PROMPTS
from core.prompt.prompt_dto import PromptCode, PromptSettings, PromptSnapshot
from core.prompt.prompt_enum import DocumentUnit, OutputFormat, PromptLanguage, TaskType
from core.prompt.prompt_renderer import PromptRenderer
from core.prompt.prompt_specs import OUTPUT_FORMAT_SPECS
from modules.llm_assistant.strategies.ner_inline_tag_strategy import (
    LLMHighlightedAnnotationResultWithReasoning,
    LLMPassageReasoning,
    NERInlineTagStrategy,
)

# tokens start at: Alice 0, meets 6, Bob 12, and 16, Alice 20, Smith. 26
CONTENT = "Alice meets Bob and Alice Smith."
# the answer tags Alice, Bob and Alice Smith as PERSON
TAGGED = (
    "<PERSON>Alice</PERSON> meets <PERSON>Bob</PERSON> and "
    "<PERSON>Alice Smith</PERSON>."
)
PERSON_ID = 1


def _strategy() -> NERInlineTagStrategy:
    """The English inline default prompt on the whole document, code PERSON."""
    prompt = PromptSnapshot(
        task_type=TaskType.ANNOTATION,
        language=PromptLanguage.EN,
        text=DEFAULT_PROMPTS[OutputFormat.INLINE][PromptLanguage.EN].replace(
            f"<document:{OUTPUT_FORMAT_SPECS[OutputFormat.INLINE].default_document_unit.value}>",
            "<document:whole>",
        ),
        settings=PromptSettings(request_reasoning=True),
        codes=[PromptCode(code_id=PERSON_ID, name="Person", description="A person.")],
    )
    renderer = PromptRenderer(
        prompt=prompt,
        document_unit=DocumentUnit.WHOLE,
        output_format=OutputFormat.INLINE,
    )
    return NERInlineTagStrategy(renderer)


def _parse(
    text: str, reasonings: list[tuple[str, str]]
) -> list[tuple[str, str | None]]:
    """The (span text, reasoning) of every parsed span of an answer."""
    sdoc_data = SourceDocumentDataORM(
        id=1,
        content=CONTENT,
        token_starts=[0, 6, 12, 16, 20, 26],
        token_ends=[5, 11, 15, 19, 25, 32],
        sentence_starts=[0],
        sentence_ends=[len(CONTENT)],
    )
    result = LLMHighlightedAnnotationResultWithReasoning(
        text=text,
        reasonings=[
            LLMPassageReasoning(passage=passage, reasoning=reasoning)
            for passage, reasoning in reasonings
        ],
    )
    spans = _strategy().parse_result(result, sdoc_data, message_id=0)
    return [(span["text"], span["reasoning"]) for span in spans]


@pytest.mark.parametrize(
    "passage",
    [
        # The passage exactly as tagged.
        pytest.param("Bob", id="exact"),
        # The passage repeats the inline tags of the answer.
        pytest.param("<PERSON>Bob</PERSON>", id="with-tags"),
        # Tags in another case are inline tags as well.
        pytest.param("<person>Bob</person>", id="with-lowercase-tags"),
        # Another case and surrounding whitespace.
        pytest.param("  bOB ", id="case-and-whitespace"),
    ],
)
def test_reasoning_matches_its_tag_by_normalized_passage(passage: str) -> None:
    """Bob gets its reasoning however the passage is written; the others get none."""
    spans = _parse(TAGGED, [(passage, "Bob is a name.")])

    assert spans == [
        ("Alice", None),
        ("Bob", "Bob is a name."),
        ("Alice Smith", None),
    ]


def test_reasoning_matches_a_passage_with_other_inner_whitespace() -> None:
    """A passage whose words are separated by other whitespace still matches."""
    spans = _parse(TAGGED, [("Alice \n  Smith", "A full name.")])

    assert spans[2] == ("Alice Smith", "A full name.")


def test_repeated_passages_get_their_reasonings_in_answer_order() -> None:
    """Two tags of the same passage take its two reasonings in order; a passage
    reasoned only once leaves its second tag without reasoning."""
    text = "<PERSON>Alice</PERSON> meets Bob and <PERSON>Alice</PERSON> Smith."
    twice = _parse(text, [("Alice", "First Alice."), ("alice", "Second Alice.")])
    once = _parse(text, [("Alice", "First Alice.")])

    assert twice == [("Alice", "First Alice."), ("Alice", "Second Alice.")]
    assert once == [("Alice", "First Alice."), ("Alice", None)]


def test_reasoning_of_an_untagged_passage_is_ignored() -> None:
    """A reasoning for a passage that is not tagged gives no span a reasoning and
    does not shift the reasonings of the tagged passages."""
    spans = _parse(TAGGED, [("meets", "A verb."), ("Bob", "Bob is a name.")])

    assert spans == [
        ("Alice", None),
        ("Bob", "Bob is a name."),
        ("Alice Smith", None),
    ]
