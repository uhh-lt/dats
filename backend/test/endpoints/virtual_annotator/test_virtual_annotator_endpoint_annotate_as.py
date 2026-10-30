import pytest
from fastapi.testclient import TestClient

from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
)
from core.annotation.span_annotation_dto import SpanAnnotationCreate, SpanAnnotationRead

from .conftest import SENTENCES, VirtualAnnotatorProject


def _span_create(project: VirtualAnnotatorProject, word: str) -> SpanAnnotationCreate:
    """A span annotation of one word of the fixture document."""
    content = " ".join(SENTENCES)
    words = content.split(" ")
    begin = content.index(word)
    token = words.index(word)
    return SpanAnnotationCreate(
        sdoc_id=project["sdoc"].id,
        code_id=project["code"].id,
        begin=begin,
        end=begin + len(word),
        begin_token=token,
        end_token=token + 1,
        span_text=word,
    )


# ===========================================================================
# ANNOTATE AS (PUT /span, /span/bulk/create, /sentence ?annotate_as_user_id) TESTS
# ===========================================================================


def test_create_span_annotation_as_virtual_annotator(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """A human creates a span annotation owned by a virtual annotator."""
    run2 = virtual_annotator_project["run2"]

    response = client.put(
        "/span",
        params={"annotate_as_user_id": run2.id},
        json=_span_create(virtual_annotator_project, "gamma.").model_dump(),
    )

    assert response.status_code == 200, response.text
    assert SpanAnnotationRead.model_validate(response.json()).user_id == run2.id


def test_create_span_annotations_bulk_as_virtual_annotator(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """Bulk creation annotates all spans as the virtual annotator."""
    run2 = virtual_annotator_project["run2"]

    response = client.put(
        "/span/bulk/create",
        params={"annotate_as_user_id": run2.id},
        json=[
            _span_create(virtual_annotator_project, text).model_dump()
            for text in ("beta", "epsilon")
        ],
    )

    assert response.status_code == 200, response.text
    spans = [SpanAnnotationRead.model_validate(data) for data in response.json()]
    assert [span.user_id for span in spans] == [run2.id, run2.id]


def test_create_sentence_annotation_as_virtual_annotator(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """A human creates a sentence annotation owned by a virtual annotator."""
    run2 = virtual_annotator_project["run2"]

    response = client.put(
        "/sentence",
        params={"annotate_as_user_id": run2.id},
        json=SentenceAnnotationCreate(
            sdoc_id=virtual_annotator_project["sdoc"].id,
            code_id=virtual_annotator_project["code"].id,
            sentence_id_start=1,
            sentence_id_end=1,
        ).model_dump(),
    )

    assert response.status_code == 200, response.text
    assert SentenceAnnotationRead.model_validate(response.json()).user_id == run2.id


def test_create_span_annotation_without_annotate_as_belongs_to_current_user(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """Without `annotate_as_user_id`, the annotation belongs to the current user."""
    response = client.put(
        "/span", json=_span_create(virtual_annotator_project, "zeta.").model_dump()
    )

    assert response.status_code == 200, response.text
    span = SpanAnnotationRead.model_validate(response.json())
    assert span.user_id == virtual_annotator_project["user"].id


@pytest.mark.parametrize(
    "user_key",
    [
        # humans, also the current user, are no virtual annotators
        pytest.param("user", id="human-self"),
        pytest.param("other_user", id="human-other"),
        # a virtual annotator of another project
        pytest.param("other_run", id="foreign-virtual-annotator"),
    ],
)
def test_create_span_annotation_as_human_or_foreign_annotator_is_rejected(
    client: TestClient,
    virtual_annotator_project: VirtualAnnotatorProject,
    user_key: str,
):
    """Annotations can only be created as a virtual annotator of the document's
    project."""
    user = virtual_annotator_project[user_key]  # type: ignore[literal-required]

    response = client.put(
        "/span",
        params={"annotate_as_user_id": user.id},
        json=_span_create(virtual_annotator_project, "gamma.").model_dump(),
    )

    assert response.status_code == 400, response.text
