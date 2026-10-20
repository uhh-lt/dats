import pytest
from fastapi.testclient import TestClient

# ===========================================================================
# UPDATE WHITEBOARD (/whiteboard/{whiteboard_id}) TESTS
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

    response = client.patch(f"/whiteboard/{whiteboard.id}", json=payload)

    assert response.status_code == 422, response.text
    response = client.get(f"/whiteboard/{whiteboard.id}")
    assert response.status_code == 200, response.text
    assert response.json()["title"] == "Test Whiteboard"


def test_update_whiteboard_title(client: TestClient, project_with_whiteboard) -> None:
    """Updating only the title renames the whiteboard."""
    whiteboard = project_with_whiteboard["whiteboard"]

    response = client.patch(
        f"/whiteboard/{whiteboard.id}", json={"title": "Renamed Whiteboard"}
    )

    assert response.status_code == 200, response.text
    assert response.json()["title"] == "Renamed Whiteboard"
