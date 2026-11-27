from fastapi.testclient import TestClient

# ===========================================================================
# HEARTBEAT (GET /heartbeat) TESTS
# ===========================================================================


def test_heartbeat_answers_true(client: TestClient) -> None:
    """The liveness check answers true while the API is up."""
    response = client.get("/heartbeat")

    assert response.status_code == 200, response.text
    assert response.json() is True
