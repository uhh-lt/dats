import pytest
from fastapi.testclient import TestClient

from modules.agreement.agreement_dto import AgreementTextRange

from .conftest import DOCUMENT_A, AgreementProject

TALKED_BEGIN = DOCUMENT_A.index("talked about")
TALKED_END = TALKED_BEGIN + len("talked about")

# ===========================================================================
# SEGMENT TEXTS (/agreement/segment_texts) TESTS
# ===========================================================================


def _post(client: TestClient, project_id: int, ranges: list[AgreementTextRange]):
    return client.post(
        "/agreement/segment_texts",
        params={"project_id": project_id},
        json=[text_range.model_dump(mode="json") for text_range in ranges],
    )


# --- A. texts ----------------------------------------------------------------------


def test_segment_texts_are_returned_in_the_order_of_the_ranges(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """The texts of the ranges of document A, in request order, repeated ranges
    included."""
    p = agreement_project
    sdoc_id = p["sdoc_a"].id
    ranges = [
        AgreementTextRange(sdoc_id=sdoc_id, begin=TALKED_BEGIN, end=TALKED_END),
        AgreementTextRange(sdoc_id=sdoc_id, begin=0, end=4),
        AgreementTextRange(sdoc_id=sdoc_id, begin=TALKED_BEGIN, end=TALKED_END),
    ]

    response = _post(client, p["project"].id, ranges)

    assert response.status_code == 200, response.text
    assert response.json() == ["talked about", "Anna", "talked about"]


def test_segment_texts_of_no_ranges_are_empty(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """An empty request returns an empty list."""
    response = _post(client, agreement_project["project"].id, [])

    assert response.status_code == 200, response.text
    assert response.json() == []


# --- B. invalid input --------------------------------------------------------------
# The documents must belong to the project the user is a member of.


@pytest.mark.parametrize(
    "sdoc_key,expected_status",
    [
        # A document of another project is rejected.
        pytest.param("other_sdoc", 400, id="document-of-other-project"),
        # A document ID that does not exist is not found.
        pytest.param(None, 404, id="unknown-document"),
    ],
)
def test_segment_texts_reject_documents_outside_the_project(
    client: TestClient,
    agreement_project: AgreementProject,
    sdoc_key: str | None,
    expected_status: int,
) -> None:
    """Texts of documents outside the project are never returned."""
    p = agreement_project
    sdoc_id = p["other_sdoc"].id if sdoc_key else 999_999

    response = _post(
        client,
        p["project"].id,
        [AgreementTextRange(sdoc_id=sdoc_id, begin=0, end=3)],
    )

    assert response.status_code == expected_status, response.text
    assert "Not shared" not in response.text


def test_segment_texts_reject_project_of_other_users(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """The test user is no member of the other project (403)."""
    p = agreement_project

    response = _post(
        client,
        p["other_project"].id,
        [AgreementTextRange(sdoc_id=p["other_sdoc"].id, begin=0, end=3)],
    )

    assert response.status_code == 403, response.text
