from fastapi.testclient import TestClient

from common.doc_type_enum import DocType
from composite_keys_test_utils import TwoTenants
from modules.code_frequency.code_frequency_dto import CodeFrequency, CodeOccurrence

# ===========================================================================
# CODE FREQUENCIES (/projects/{project_id}/code-frequency/frequencies) TESTS
# ===========================================================================


def _frequencies(
    client: TestClient, project_id: int, code_ids: list[int], user_id: int
) -> list[CodeFrequency]:
    response = client.post(
        f"/projects/{project_id}/code-frequency/frequencies",
        json={
            "code_ids": code_ids,
            "user_ids": [user_id],
            "doctypes": [DocType.text],
        },
    )
    assert response.status_code == 200, response.text
    return [CodeFrequency.model_validate(f) for f in response.json()]


def test_code_frequencies_count_the_annotations_of_the_project(
    client: TestClient, tenants: TwoTenants, test_user
) -> None:
    """The own code has a span, a sentence and a bounding box annotation; the code
    of the other project, with the same annotations there, counts nothing."""
    own, foreign = tenants["own"], tenants["foreign"]

    frequencies = _frequencies(
        client, own["project"].id, [own["code"].id, foreign["code"].id], test_user.id
    )

    assert frequencies == [
        CodeFrequency(code_id=own["code"].id, count=3, child_count=0, total_count=3),
        CodeFrequency(
            code_id=foreign["code"].id, count=0, child_count=0, total_count=0
        ),
    ]


# ===========================================================================
# CODE OCCURRENCES (/projects/{project_id}/code-frequency/occurrences) TESTS
# ===========================================================================


def _occurrences(
    client: TestClient, project_id: int, code_id: int, user_id: int
) -> list[CodeOccurrence]:
    response = client.post(
        f"/projects/{project_id}/code-frequency/occurrences",
        params={"code_id": code_id, "return_children": False},
        json={"user_ids": [user_id], "doctypes": [DocType.text]},
    )
    assert response.status_code == 200, response.text
    return [CodeOccurrence.model_validate(o) for o in response.json()]


def test_code_occurrences_are_found_in_the_documents_of_the_project(
    client: TestClient, tenants: TwoTenants, test_user
) -> None:
    """The span, sentence and bounding box annotation of the own code each occur in
    the own document."""
    own = tenants["own"]

    occurrences = _occurrences(client, own["project"].id, own["code"].id, test_user.id)

    assert len(occurrences) == 3
    assert {o.sdoc.id for o in occurrences} == {own["sdoc"].id}
    assert {o.code.id for o in occurrences} == {own["code"].id}


def test_code_occurrences_of_a_code_of_another_project_match_nothing(
    client: TestClient, tenants: TwoTenants, test_user
) -> None:
    own, foreign = tenants["own"], tenants["foreign"]

    assert (
        _occurrences(client, own["project"].id, foreign["code"].id, test_user.id) == []
    )
