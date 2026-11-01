"""The annotation tasks store the LLM's reasoning of each annotation as a memo.

The tests feed fixed, parsed LLM answers to the tasks of the LLM Assistant job
(no LLM call) and read the memos of the created annotations through the memo
endpoint.
"""

import json

import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.doc.source_document_data_crud import crud_sdoc_data
from core.memo.memo_dto import MemoRead
from core.memo.memo_enum import AttachedObjectType
from core.prompt.prompt_defaults import DEFAULT_PROMPTS
from core.prompt.prompt_dto import PromptSettings, PromptSnapshot
from core.prompt.prompt_enum import DocumentUnit, OutputFormat, PromptLanguage
from core.prompt.prompt_service import PromptService
from core.prompt.prompt_specs import OUTPUT_FORMAT_SPECS
from modules.llm_assistant.llm_assistant_job_dto import LLMAssistantJobInput
from modules.llm_assistant.strategies.fuzzy_grounding_strategy import (
    LLMExtractedPassage,
    LLMExtractedPassageWithReasoning,
    LLMExtractionResult,
    LLMExtractionResultWithReasoning,
)
from modules.llm_assistant.strategies.ner_inline_tag_strategy import (
    LLMHighlightedAnnotationResult,
    LLMHighlightedAnnotationResultWithReasoning,
    LLMPassageReasoning,
)
from modules.llm_assistant.strategies.sentence_annotation_strategy import (
    LLMSentenceAnnotationResult,
    LLMSentenceAnnotationResults,
    LLMSentenceAnnotationResultsWithReasoning,
    LLMSentenceAnnotationResultWithReasoning,
)
from modules.llm_assistant.strategies.strategy_factory import build_strategy
from modules.llm_assistant.tasks.annotation_task import AnnotationTask
from modules.llm_assistant.tasks.llm_assistant_document_processor import (
    LLMAssistantDocumentResponse,
    LLMAssistantResponseItem,
)
from modules.llm_assistant.tasks.llm_assistant_task import LLMAssistantTaskContext
from modules.llm_assistant.tasks.sentence_annotation_task import (
    SentenceAnnotationTask,
)
from repos.llm_repo import LLMBatchChatResponse, LLMRepo

from .conftest import TARGET_SENTENCES, LLMAssistantProject, prompt_code

TARGET_TEXT = " ".join(TARGET_SENTENCES)
ALICE_REASONING = "Alice is named as the author."
IS_ALICE_REASONING = "The author is a person called Alice."
FACT_REASONINGS = [
    "The sentence states the author.",
    "The sentence states the year.",
    "The sentence states the review status.",
]

# inline answers: Alice and the year are tagged as PERSON, with and without a
# reasoning for Alice
INLINE_TEXT = TARGET_TEXT.replace("Alice", "<PERSON>Alice</PERSON>").replace(
    "year is 2024", "year is <PERSON>2024</PERSON>"
)
INLINE_WITH_REASONING = LLMHighlightedAnnotationResultWithReasoning(
    text=INLINE_TEXT,
    reasonings=[LLMPassageReasoning(passage="Alice", reasoning=ALICE_REASONING)],
)
INLINE_WITHOUT_REASONING = LLMHighlightedAnnotationResult(text=INLINE_TEXT)

# context answers: the overlapping quotes "Alice" and "is Alice"
CONTEXT_PASSAGES = [
    {"exact_quote": "Alice", "context_before": "author is ", "context_after": "."},
    {"exact_quote": "is Alice", "context_before": "author ", "context_after": "."},
]
CONTEXT_WITH_REASONING = LLMExtractionResultWithReasoning(
    passages=[
        LLMExtractedPassageWithReasoning(
            category="PERSON", reasoning=reasoning, **passage
        )
        for passage, reasoning in zip(
            CONTEXT_PASSAGES, [ALICE_REASONING, IS_ALICE_REASONING]
        )
    ]
)
CONTEXT_WITHOUT_REASONING = LLMExtractionResult(
    passages=[
        LLMExtractedPassage(category="PERSON", **passage)
        for passage in CONTEXT_PASSAGES
    ]
)

# sentence answers: sentences 1, 2 and 4 (indices 0, 1, 3) are FACTs
FACT_SENTENCE_NUMBERS = [1, 2, 4]
SENTENCES_WITH_REASONING = LLMSentenceAnnotationResultsWithReasoning(
    data=[
        LLMSentenceAnnotationResultWithReasoning(
            sent_id=sent_id, category="FACT", reasoning=reasoning
        )
        for sent_id, reasoning in zip(FACT_SENTENCE_NUMBERS, FACT_REASONINGS)
    ]
)
SENTENCES_WITHOUT_REASONING = LLMSentenceAnnotationResults(
    data=[
        LLMSentenceAnnotationResult(sent_id=sent_id, category="FACT")
        for sent_id in FACT_SENTENCE_NUMBERS
    ]
)


def _run_task(
    db: Session,
    project: LLMAssistantProject,
    *,
    output_format: OutputFormat,
    request_reasoning: bool,
    answer: BaseModel,
) -> list[int]:
    """Process the target document with one fixed answer to its single message.

    The prompt is the English default prompt of the format on the whole
    document, with code PERSON (span formats) or FACT (sentences). The
    annotations are created for the virtual user ``run_a``.

    Returns:
        The ids of the created annotations.
    """
    spec = OUTPUT_FORMAT_SPECS[output_format]
    is_sentence = output_format == OutputFormat.SENTENCES
    draft = PromptSnapshot(
        task_type=spec.task_type,
        language=PromptLanguage.EN,
        text=DEFAULT_PROMPTS[output_format][PromptLanguage.EN].replace(
            f"<document:{spec.default_document_unit.value}>",
            f"<document:{DocumentUnit.WHOLE.value}>",
        ),
        settings=PromptSettings(request_reasoning=request_reasoning),
        codes=[prompt_code(project["fact_code" if is_sentence else "person_code"])],
    )
    strategy = build_strategy(PromptService().build_renderer(prompt=draft))
    payload = LLMAssistantJobInput(
        project_id=project["project"].id,
        task_type=draft.task_type,
        sdoc_ids=[project["target_sdoc"].id],
        model="default",
        draft=draft,
        virtual_user_id=project["run_a"].id,
        delete_existing_annotations=False,
    )
    document = LLMAssistantDocumentResponse(
        sdoc_data=crud_sdoc_data.read(db=db, id=project["target_sdoc"].id),
        responses=[
            LLMAssistantResponseItem(
                message_id=0,
                response=LLMBatchChatResponse(
                    raw=answer.model_dump_json(), parsed=answer
                ),
            )
        ],
    )
    task = (SentenceAnnotationTask if is_sentence else AnnotationTask)(llm=LLMRepo())
    # the strategy and the answer match the task, which the types cannot express
    result = task._process_document(
        context=LLMAssistantTaskContext(db=db, payload=payload, strategy=strategy),  # type: ignore
        document=document,  # type: ignore
    )
    db.commit()
    assert result.status == "finished", result.model_dump_json(indent=2)
    return [annotation.id for annotation in result.suggested_annotations]


def _memos(
    client: TestClient, attached_object_type: AttachedObjectType, annotation_id: int
) -> list[MemoRead]:
    response = client.get(
        f"/memo/attached_obj/{attached_object_type.value}/to/{annotation_id}"
    )
    assert response.status_code == 200, response.text
    return [MemoRead.model_validate(memo) for memo in response.json()]


def _assert_reasoning_memo(
    memo: MemoRead, project: LLMAssistantProject, paragraphs: list[str]
) -> None:
    """A reasoning memo of run A with one paragraph per reasoning."""
    assert memo.user_id == project["run_a"].id
    assert memo.project_id == project["project"].id
    assert memo.title == "LLM reasoning"
    assert memo.content == "\n\n".join(paragraphs)
    assert json.loads(memo.content_json) == [
        {"type": "paragraph", "content": paragraph} for paragraph in paragraphs
    ]


# ===========================================================================
# SPAN ANNOTATION TASK
# ===========================================================================


def test_inline_reasoning_is_stored_as_a_memo_of_its_annotation(
    client: TestClient,
    db_session: Session,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Alice gets a memo of run A with her reasoning; the year, which has no
    reasoning in the answer, gets no memo."""
    project = llm_assistant_project
    alice_id, year_id = _run_task(
        db_session,
        project,
        output_format=OutputFormat.INLINE,
        request_reasoning=True,
        answer=INLINE_WITH_REASONING,
    )

    alice_memos = _memos(client, AttachedObjectType.span_annotation, alice_id)
    assert len(alice_memos) == 1
    _assert_reasoning_memo(alice_memos[0], project, [ALICE_REASONING])
    assert _memos(client, AttachedObjectType.span_annotation, year_id) == []


def test_context_reasonings_of_merged_suggestions_become_one_memo(
    client: TestClient,
    db_session: Session,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """The overlapping quotes "Alice" and "is Alice" are merged into one
    annotation, whose memo has both reasonings, in answer order."""
    project = llm_assistant_project
    (annotation_id,) = _run_task(
        db_session,
        project,
        output_format=OutputFormat.CONTEXT,
        request_reasoning=True,
        answer=CONTEXT_WITH_REASONING,
    )

    memos = _memos(client, AttachedObjectType.span_annotation, annotation_id)
    assert len(memos) == 1
    _assert_reasoning_memo(memos[0], project, [ALICE_REASONING, IS_ALICE_REASONING])


@pytest.mark.parametrize(
    "output_format,answer,num_annotations",
    [
        # Inline tags: Alice and the year.
        pytest.param(OutputFormat.INLINE, INLINE_WITHOUT_REASONING, 2, id="inline"),
        # Quotes with context: "Alice" and "is Alice", merged.
        pytest.param(OutputFormat.CONTEXT, CONTEXT_WITHOUT_REASONING, 1, id="context"),
    ],
)
def test_span_annotations_get_no_memo_without_requested_reasoning(
    client: TestClient,
    db_session: Session,
    llm_assistant_project: LLMAssistantProject,
    output_format: OutputFormat,
    answer: BaseModel,
    num_annotations: int,
) -> None:
    """Without ``request_reasoning`` the annotations are created without memos."""
    annotation_ids = _run_task(
        db_session,
        llm_assistant_project,
        output_format=output_format,
        request_reasoning=False,
        answer=answer,
    )

    assert len(annotation_ids) == num_annotations
    for annotation_id in annotation_ids:
        assert _memos(client, AttachedObjectType.span_annotation, annotation_id) == []


# ===========================================================================
# SENTENCE ANNOTATION TASK
# ===========================================================================


def test_sentence_reasonings_are_stored_as_one_memo_per_range(
    client: TestClient,
    db_session: Session,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Sentences 1 and 2 become one FACT range with both reasonings in its memo,
    sentence 4 its own range with its reasoning."""
    project = llm_assistant_project
    first_range_id, second_range_id = _run_task(
        db_session,
        project,
        output_format=OutputFormat.SENTENCES,
        request_reasoning=True,
        answer=SENTENCES_WITH_REASONING,
    )

    first_memos = _memos(client, AttachedObjectType.sentence_annotation, first_range_id)
    assert len(first_memos) == 1
    _assert_reasoning_memo(first_memos[0], project, FACT_REASONINGS[:2])
    second_memos = _memos(
        client, AttachedObjectType.sentence_annotation, second_range_id
    )
    assert len(second_memos) == 1
    _assert_reasoning_memo(second_memos[0], project, FACT_REASONINGS[2:])


def test_sentence_annotations_get_no_memo_without_requested_reasoning(
    client: TestClient,
    db_session: Session,
    llm_assistant_project: LLMAssistantProject,
) -> None:
    """Without ``request_reasoning`` the two FACT ranges are created without memos."""
    annotation_ids = _run_task(
        db_session,
        llm_assistant_project,
        output_format=OutputFormat.SENTENCES,
        request_reasoning=False,
        answer=SENTENCES_WITHOUT_REASONING,
    )

    assert len(annotation_ids) == 2
    for annotation_id in annotation_ids:
        assert (
            _memos(client, AttachedObjectType.sentence_annotation, annotation_id) == []
        )
