import pytest
from httpx import AsyncClient
from main import app


@pytest.mark.anyio
async def test_index():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
    print(response.headers)
    assert response.status_code == 307
    assert response.headers.get("Location") == "/docs"
