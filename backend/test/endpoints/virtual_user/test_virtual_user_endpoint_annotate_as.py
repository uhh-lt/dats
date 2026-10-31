import pytest
from fastapi.testclient import TestClient

from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
)
from core.annotation.span_annotation_dto import SpanAnnotationCreate, SpanAnnotationRead

from .conftest import SENTENCES, VirtualUserProject


def _span_create(project: VirtualUserProject, word: str) -> SpanAnnotationCreate:
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
# ANNOTATE AS (PUT /span, /span/bulk/create, /sentence ?user_id) TESTS
# ===========================================================================


def test_create_span_annotation_as_virtual_user(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """A user creates a span annotation owned by a virtual user."""
    run2 = virtual_user_project["run2"]

    response = client.put(
        "/span",
        params={"user_id": run2.id},
        json=_span_create(virtual_user_project, "gamma.").model_dump(),
    )

    assert response.status_code == 200, response.text
    assert SpanAnnotationRead.model_validate(response.json()).user_id == run2.id


def test_create_span_annotations_bulk_as_virtual_user(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """Bulk creation annotates all spans as the virtual user."""
    run2 = virtual_user_project["run2"]

    response = client.put(
        "/span/bulk/create",
        params={"user_id": run2.id},
        json=[
            _span_create(virtual_user_project, text).model_dump()
            for text in ("beta", "epsilon")
        ],
    )

    assert response.status_code == 200, response.text
    spans = [SpanAnnotationRead.model_validate(data) for data in response.json()]
    assert [span.user_id for span in spans] == [run2.id, run2.id]


def test_create_sentence_annotation_as_virtual_user(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """A user creates a sentence annotation owned by a virtual user."""
    run2 = virtual_user_project["run2"]

    response = client.put(
        "/sentence",
        params={"user_id": run2.id},
        json=SentenceAnnotationCreate(
            sdoc_id=virtual_user_project["sdoc"].id,
            code_id=virtual_user_project["code"].id,
            sentence_id_start=1,
            sentence_id_end=1,
        ).model_dump(),
    )

    assert response.status_code == 200, response.text
    assert SentenceAnnotationRead.model_validate(response.json()).user_id == run2.id


@pytest.mark.parametrize(
    "params",
    [
        # no user_id: the current user
        pytest.param({}, id="default"),
        # the own id
        pytest.param(None, id="own-id"),
    ],
)
def test_create_span_annotation_as_current_user(
    client: TestClient,
    virtual_user_project: VirtualUserProject,
    params: dict[str, int] | None,
):
    """Without `user_id` or with the own id, the annotation belongs to the current
    user."""
    user = virtual_user_project["user"]

    response = client.put(
        "/span",
        params={"user_id": user.id} if params is None else params,
        json=_span_create(virtual_user_project, "zeta.").model_dump(),
    )

    assert response.status_code == 200, response.text
    assert SpanAnnotationRead.model_validate(response.json()).user_id == user.id


@pytest.mark.parametrize(
    "user_key",
    [
        # another user (not virtual)
        pytest.param("other_user", id="other-user"),
        # a virtual user of another project
        pytest.param("other_run", id="foreign-virtual-user"),
    ],
)
def test_create_span_annotation_as_other_user_or_foreign_virtual_user_is_forbidden(
    client: TestClient,
    virtual_user_project: VirtualUserProject,
    user_key: str,
):
    """Annotations can only be created as a virtual user of the document's
    project."""
    user = virtual_user_project[user_key]  # type: ignore[literal-required]

    response = client.put(
        "/span",
        params={"user_id": user.id},
        json=_span_create(virtual_user_project, "gamma.").model_dump(),
    )

    assert response.status_code == 403, response.text
