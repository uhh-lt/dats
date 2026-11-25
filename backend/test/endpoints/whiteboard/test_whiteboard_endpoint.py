import pytest
from fastapi.testclient import TestClient

from composite_keys_test_utils import TwoTenants
from modules.whiteboard.whiteboard_dto import WhiteboardCreate, WhiteboardRead


def _url(project_id: int, path: str = "") -> str:
    """The URL of the whiteboard routes of the project."""
    return f"/projects/{project_id}/whiteboards{path}"


# ===========================================================================
# CREATE WHITEBOARD (/projects/{project_id}/whiteboards) TESTS
# ===========================================================================


def test_create_whiteboard_in_the_project_of_the_path(
    client: TestClient, tenants: TwoTenants
) -> None:
    """A new whiteboard belongs to the project of the path and is listed there,
    next to "Whiteboard <p>", but not in the other project."""
    own, foreign = tenants["own"], tenants["foreign"]
    p = own["project"].id

    response = client.put(
        _url(p), json=WhiteboardCreate(title="New").model_dump(mode="json")
    )

    assert response.status_code == 200, response.text
    created = WhiteboardRead.model_validate(response.json())
    assert created.project_id == p
    response = client.get(_url(p))
    assert {wb["title"] for wb in response.json()} == {f"Whiteboard {p}", "New"}
    response = client.get(_url(foreign["project"].id))
    assert [wb["id"] for wb in response.json()] == [foreign["whiteboard"].id]


# ===========================================================================
# DUPLICATE WHITEBOARD (/projects/{project_id}/whiteboards/{whiteboard_id}/duplicate) TESTS
# ===========================================================================


def test_duplicate_whiteboard_copies_it_in_its_project(
    client: TestClient, tenants: TwoTenants
) -> None:
    own = tenants["own"]
    p = own["project"].id

    response = client.put(_url(p, f"/{own['whiteboard'].id}/duplicate"))

    assert response.status_code == 200, response.text
    copy = WhiteboardRead.model_validate(response.json())
    assert (copy.title, copy.project_id) == (f"Whiteboard {p} (Copy)", p)


# ===========================================================================
# GET WHITEBOARD (/projects/{project_id}/whiteboards/{whiteboard_id}[/data]) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "method,path",
    [
        # read, read the data of the nodes, duplicate, update, delete
        pytest.param("GET", "", id="get"),
        pytest.param("GET", "/data", id="data"),
        pytest.param("PUT", "/duplicate", id="duplicate"),
        pytest.param("PATCH", "", id="update"),
        pytest.param("DELETE", "", id="delete"),
    ],
)
def test_whiteboard_of_another_project_is_not_found(
    client: TestClient, tenants: TwoTenants, method: str, path: str
) -> None:
    """A whiteboard of another project of the user answers 404 on every route and
    stays unchanged."""
    own, foreign = tenants["own"], tenants["foreign"]
    whiteboard_id = foreign["whiteboard"].id

    response = client.request(
        method,
        _url(own["project"].id, f"/{whiteboard_id}{path}"),
        json={"title": "renamed"} if method == "PATCH" else None,
    )

    assert response.status_code == 404, response.text
    response = client.get(_url(foreign["project"].id, f"/{whiteboard_id}"))
    assert response.json()["title"] == f"Whiteboard {foreign['project'].id}"


# ===========================================================================
# UPDATE WHITEBOARD (/projects/{project_id}/whiteboards/{whiteboard_id}) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "payload",
    [
        # empty PATCH body
        pytest.param({}, id="empty"),
        # content is NOT NULL, null is no valid value
        pytest.param({"content": None}, id="content-null"),
        # title is NOT NULL, null is no valid value
        pytest.param({"title": None}, id="title-null"),
    ],
)
def test_update_whiteboard_rejects_empty_or_null_update(
    client: TestClient, project_with_whiteboard, payload: dict
) -> None:
    """An empty update or an explicit null for a NOT NULL field is a 422, and the whiteboard is unchanged.

    The response is checked as JSON: WhiteboardRead parses content from the stored string.
    """
    whiteboard = project_with_whiteboard["whiteboard"]
    project_id = project_with_whiteboard["project"].id

    response = client.patch(_url(project_id, f"/{whiteboard.id}"), json=payload)

    assert response.status_code == 422, response.text
    response = client.get(_url(project_id, f"/{whiteboard.id}"))
    assert response.status_code == 200, response.text
    assert response.json()["title"] == "Test Whiteboard"


def test_update_whiteboard_title(client: TestClient, project_with_whiteboard) -> None:
    """Updating only the title renames the whiteboard."""
    whiteboard = project_with_whiteboard["whiteboard"]
    project_id = project_with_whiteboard["project"].id

    response = client.patch(
        _url(project_id, f"/{whiteboard.id}"), json={"title": "Renamed Whiteboard"}
    )

    assert response.status_code == 200, response.text
    assert response.json()["title"] == "Renamed Whiteboard"
