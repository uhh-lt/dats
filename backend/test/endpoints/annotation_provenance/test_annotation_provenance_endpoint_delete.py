import pytest
from fastapi.testclient import TestClient

from dats_test_utils import create_user_client

from .provenance_utils import ANNOTATION_KINDS, AnnotationKind, get_annotation

# ===========================================================================
# DELETE THE SOURCE (/span, /sentence, /bbox, /code, /user) TESTS
# ===========================================================================
# The provenance columns are ON DELETE SET NULL: deleting the source annotation, its
# user or its code clears only that column of the copy and keeps the rest.


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_delete_source_annotation_keeps_source_user_and_code_of_copy(
    client: TestClient, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """Deleting the source annotation clears the copy's `source_annotation_id`; the
    snapshot of its user and code stays."""
    project = provenance_project_with_copies
    copy_id = project[f"{kind}_copies"]["copy_id"]

    response = client.delete(f"/{kind}/{project[kind]['source_id']}")

    assert response.status_code == 200, response.text
    copy = get_annotation(client, kind, copy_id)
    assert copy.source_annotation_id is None
    assert copy.source_user_id == project["assistant"].id
    assert copy.source_code_id == project["code_a"].id


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_delete_source_code_keeps_source_user_of_copy(
    client: TestClient, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """Deleting "Code A" deletes the source annotation (it has Code A) and clears
    both the copy's `source_annotation_id` and `source_code_id`; the copy (Code B)
    and its source user stay."""
    project = provenance_project_with_copies
    copy_id = project[f"{kind}_copies"]["copy_id"]

    response = client.delete(f"/code/{project['code_a'].id}")

    assert response.status_code == 200, response.text
    copy = get_annotation(client, kind, copy_id)
    assert copy.code_id == project["code_b"].id
    assert copy.source_annotation_id is None
    assert copy.source_user_id == project["assistant"].id
    assert copy.source_code_id is None


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_delete_source_user_keeps_source_code_of_copy(
    client: TestClient,
    app_client: TestClient,
    provenance_project_with_copies,
    kind: AnnotationKind,
) -> None:
    """The assistant deleting their account deletes their annotations and clears the
    copy's `source_annotation_id` and `source_user_id`; the source code stays."""
    project = provenance_project_with_copies
    copy_id = project[f"{kind}_copies"]["copy_id"]
    assistant_client = create_user_client(app_client, project["assistant"])

    response = assistant_client.delete("/user/")

    assert response.status_code == 200, response.text
    copy = get_annotation(client, kind, copy_id)
    assert copy.source_annotation_id is None
    assert copy.source_user_id is None
    assert copy.source_code_id == project["code_a"].id
