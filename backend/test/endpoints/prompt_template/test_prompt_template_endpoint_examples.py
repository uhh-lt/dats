from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from core.prompt_template.prompt_template_dto import (
    PromptExample,
    PromptExamplesCreate,
    PromptExampleSpan,
    SentencePromptExample,
    SpanPromptExample,
)
from core.prompt_template.prompt_template_enum import PromptExampleKind

from .conftest import (
    EXAMPLE_SENTENCES,
    PromptTemplateProject,
)

PROMPT_TEMPLATE_URL = "/prompt_template"
PromptExampleList = TypeAdapter(list[PromptExample])


def _post_examples(
    client: TestClient,
    project: PromptTemplateProject,
    kind: PromptExampleKind,
    annotation_ids: list[int],
    project_key: str = "project",
):
    return client.post(
        f"{PROMPT_TEMPLATE_URL}/examples",
        json=PromptExamplesCreate(
            project_id=project[project_key].id,  # type: ignore[literal-required]
            kind=kind,
            annotation_ids=annotation_ids,
        ).model_dump(mode="json"),
    )


# ===========================================================================
# CREATE EXAMPLES (POST /prompt_template/examples) TESTS
# ===========================================================================


# --- A. span examples ---------------------------------------------------------------
# A span example is the sentence around an annotation with all spans its annotator
# annotated in it; annotations of the same text are merged.


def test_create_span_example_shows_all_spans_of_the_annotator_in_the_sentence(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """The Alice example also shows ``the report`` but not the assistant's ``wrote``."""
    project = prompt_template_project
    response = _post_examples(
        client, project, PromptExampleKind.SPAN, [project["alice_annotation"].id]
    )
    assert response.status_code == 200, response.text
    assert PromptExampleList.validate_python(response.json()) == [
        SpanPromptExample(
            kind=PromptExampleKind.SPAN,
            sdoc_id=project["sdoc"].id,
            source_annotation_ids=[project["alice_annotation"].id],
            text=EXAMPLE_SENTENCES[0],
            spans=[
                PromptExampleSpan(code_id=project["person_code"].id, begin=0, end=5),
                PromptExampleSpan(code_id=project["claim_code"].id, begin=12, end=22),
            ],
        )
    ]


def test_create_span_examples_merges_annotations_of_the_same_sentence(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """``Alice`` and ``the report`` (both S0) become one example; ``Bob`` (S2) another."""
    project = prompt_template_project
    response = _post_examples(
        client,
        project,
        PromptExampleKind.SPAN,
        [
            project["alice_annotation"].id,
            project["report_annotation"].id,
            project["bob_annotation"].id,
        ],
    )
    assert response.status_code == 200, response.text
    examples = PromptExampleList.validate_python(response.json())

    assert examples == [
        project["alice_example"].model_copy(
            update={
                "source_annotation_ids": [
                    project["alice_annotation"].id,
                    project["report_annotation"].id,
                ]
            }
        ),
        SpanPromptExample(
            kind=PromptExampleKind.SPAN,
            sdoc_id=project["sdoc"].id,
            source_annotation_ids=[project["bob_annotation"].id],
            text=EXAMPLE_SENTENCES[2],
            spans=[
                PromptExampleSpan(code_id=project["person_code"].id, begin=0, end=3)
            ],
        ),
    ]


def test_create_span_example_of_another_annotator_shows_only_its_spans(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """The assistant's ``wrote`` example shows its own span only."""
    project = prompt_template_project
    response = _post_examples(
        client, project, PromptExampleKind.SPAN, [project["assistant_annotation"].id]
    )
    assert response.status_code == 200, response.text
    [example] = PromptExampleList.validate_python(response.json())
    assert isinstance(example, SpanPromptExample)
    assert example.text == EXAMPLE_SENTENCES[0]
    assert example.spans == [
        PromptExampleSpan(code_id=project["claim_code"].id, begin=6, end=11)
    ]


# --- B. sentence examples -----------------------------------------------------------


def test_create_sentence_examples_copy_the_text_of_the_annotated_sentences(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """A sentence example is the text of its sentences, in the order of the ids."""
    project = prompt_template_project
    response = _post_examples(
        client,
        project,
        PromptExampleKind.SENTENCE,
        [
            project["claim_sentence_annotation"].id,
            project["person_sentence_annotation"].id,
        ],
    )
    assert response.status_code == 200, response.text
    assert PromptExampleList.validate_python(response.json()) == [
        SentencePromptExample(
            kind=PromptExampleKind.SENTENCE,
            code_id=project["claim_code"].id,
            sdoc_id=project["sdoc"].id,
            source_annotation_ids=[project["claim_sentence_annotation"].id],
            text=f"{EXAMPLE_SENTENCES[1]} {EXAMPLE_SENTENCES[2]}",
        ),
        SentencePromptExample(
            kind=PromptExampleKind.SENTENCE,
            code_id=project["person_code"].id,
            sdoc_id=project["sdoc"].id,
            source_annotation_ids=[project["person_sentence_annotation"].id],
            text=EXAMPLE_SENTENCES[0],
        ),
    ]


# --- C. invalid requests ------------------------------------------------------------


def test_create_examples_rejects_annotations_of_another_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Examples are created from the project's own annotations only (HTTP 400)."""
    project = prompt_template_project
    response = _post_examples(
        client,
        project,
        PromptExampleKind.SPAN,
        [project["foreign_span_annotation"].id],
    )
    assert response.status_code == 400, response.text
    assert "do not belong to project" in response.text


def test_create_examples_rejects_foreign_project(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """Creating examples requires membership in the project."""
    project = prompt_template_project
    response = _post_examples(
        client,
        project,
        PromptExampleKind.SPAN,
        [project["foreign_span_annotation"].id],
        project_key="foreign_project",
    )
    assert response.status_code == 403, response.text


def test_create_examples_rejects_an_empty_selection(
    client: TestClient,
    prompt_template_project: PromptTemplateProject,
) -> None:
    """At least one annotation is required (HTTP 422)."""
    response = client.post(
        f"{PROMPT_TEMPLATE_URL}/examples",
        json={
            "project_id": prompt_template_project["project"].id,
            "kind": PromptExampleKind.SPAN.value,
            "annotation_ids": [],
        },
    )
    assert response.status_code == 422, response.text
    assert "annotation_ids" in response.text
