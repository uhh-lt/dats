import pytest
from fastapi.testclient import TestClient


@pytest.mark.anyio
async def test_index(client: TestClient):
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers.get("Location") == "/docs"
