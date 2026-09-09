from datetime import timedelta

import pytest
from dateutil.relativedelta import relativedelta
from fastapi.testclient import TestClient

from core.auth.api_key_dto import ApiKeyCreatedResponse, ApiKeyRead, ExpiryDuration

# ===========================================================================
# CREATE API KEY (/api-keys/create) TESTS
# ===========================================================================


def _create_api_key(
    client: TestClient, name: str, expires_in: ExpiryDuration | None = None
) -> ApiKeyCreatedResponse:
    """POST /api-keys/create and return the validated response."""
    params: dict[str, str] = {"name": name}
    if expires_in is not None:
        params["expires_in"] = expires_in.value
    response = client.post("/api-keys/create", params=params)
    assert response.status_code == 200, response.text
    return ApiKeyCreatedResponse.model_validate(response.json())


def test_create_api_key_with_default_expiry_returns_full_key_once(client: TestClient):
    """Creating a key with default expiry returns the full key, a prefix derived
    from it, and an expiry about one year in the future."""
    created = _create_api_key(client, name="My New Key")

    assert created.name == "My New Key"
    assert created.api_key.startswith("dats_")
    assert len(created.api_key) == len("dats_") + 64
    assert created.prefix == f"{created.api_key[:10]}..."
    assert created.expires_at is not None
    assert created.expires_at - created.created_at > timedelta(days=364)


@pytest.mark.parametrize(
    "expires_in,expected_delta",
    [
        # Each duration maps to its relativedelta from the key's created_at.
        pytest.param(ExpiryDuration.ONE_MONTH, relativedelta(months=1), id="one-month"),
        pytest.param(
            ExpiryDuration.THREE_MONTHS, relativedelta(months=3), id="three-months"
        ),
        pytest.param(
            ExpiryDuration.SIX_MONTHS, relativedelta(months=6), id="six-months"
        ),
        pytest.param(ExpiryDuration.ONE_YEAR, relativedelta(years=1), id="one-year"),
        pytest.param(
            ExpiryDuration.THREE_YEARS, relativedelta(years=3), id="three-years"
        ),
        # "never" maps to expires_at=None; expected_delta is unused.
        pytest.param(ExpiryDuration.NEVER, None, id="never"),
    ],
)
def test_create_api_key_expiry_durations(
    client: TestClient,
    expires_in: ExpiryDuration,
    expected_delta: relativedelta | None,
):
    """Every ExpiryDuration maps to the matching expires_at offset from
    created_at (compared at second precision); "never" yields expires_at=None."""
    created = _create_api_key(client, name="Duration Key", expires_in=expires_in)

    if expected_delta is None:
        assert created.expires_at is None
    else:
        assert created.expires_at is not None
        assert created.expires_at.replace(microsecond=0) == (
            created.created_at + expected_delta
        ).replace(microsecond=0)


def test_create_api_key_appears_in_list_without_full_key(client: TestClient):
    """A newly created key shows up in /api-keys/list, but the list response
    never contains the full key anywhere."""
    created = _create_api_key(client, name="Listed Key")

    response = client.get("/api-keys/list")
    assert response.status_code == 200, response.text
    keys = [ApiKeyRead.model_validate(x) for x in response.json()]

    assert [k.id for k in keys] == [created.id]
    assert keys[0].name == "Listed Key"
    assert created.api_key not in response.text


def test_create_api_key_without_name_is_rejected(client: TestClient):
    """The required query parameter `name` is missing -> 422."""
    response = client.post("/api-keys/create")

    assert response.status_code == 422, response.text


def test_create_api_key_with_invalid_expires_in_is_rejected(client: TestClient):
    """An expires_in value outside the ExpiryDuration enum -> 422."""
    response = client.post(
        "/api-keys/create", params={"name": "Bad Key", "expires_in": "forever"}
    )

    assert response.status_code == 422, response.text


# ===========================================================================
# LIST API KEYS (/api-keys/list) TESTS
# ===========================================================================


def test_list_api_keys_returns_exactly_the_current_users_keys(
    client: TestClient, api_key_project
):
    """The test user sees exactly their two fixture keys; the other user's key
    is not included."""
    response = client.get("/api-keys/list")

    assert response.status_code == 200, response.text
    keys = [ApiKeyRead.model_validate(x) for x in response.json()]
    keys_by_id = {k.id: k for k in keys}

    expiring = api_key_project["user_key_expiring"]
    never = api_key_project["user_key_never"]
    assert set(keys_by_id) == {expiring.id, never.id}
    assert api_key_project["other_user_key"].id not in keys_by_id

    assert keys_by_id[expiring.id].name == "Expiring Key"
    assert keys_by_id[expiring.id].prefix == "dats_expire..."
    assert keys_by_id[expiring.id].expires_at is not None
    assert keys_by_id[never.id].name == "Never Key"
    assert keys_by_id[never.id].prefix == "dats_never..."
    assert keys_by_id[never.id].expires_at is None


def test_list_api_keys_empty_when_user_has_no_keys(client: TestClient):
    """Without any created keys (clean database), the list is empty."""
    response = client.get("/api-keys/list")

    assert response.status_code == 200, response.text
    assert response.json() == []


# ===========================================================================
# DELETE API KEY (/api-keys/delete/{key_id}) TESTS
# ===========================================================================


def test_delete_api_key_removes_it_from_list(client: TestClient, api_key_project):
    """Deleting a key returns its ApiKeyRead and leaves only the other key."""
    expiring = api_key_project["user_key_expiring"]
    never = api_key_project["user_key_never"]

    response = client.delete(f"/api-keys/delete/{expiring.id}")

    assert response.status_code == 200, response.text
    deleted = ApiKeyRead.model_validate(response.json())
    assert deleted.id == expiring.id
    assert deleted.name == "Expiring Key"

    response = client.get("/api-keys/list")
    assert response.status_code == 200, response.text
    keys = [ApiKeyRead.model_validate(x) for x in response.json()]
    assert [k.id for k in keys] == [never.id]


def test_delete_api_key_with_nonexistent_id_returns_404(
    client: TestClient, api_key_project
):
    """An unknown key id -> 404 'API Key not found.'."""
    response = client.delete("/api-keys/delete/99999")

    assert response.status_code == 404, response.text
    assert "API Key not found." in response.text


def test_delete_api_key_of_another_user_returns_404(
    client: TestClient, api_key_project
):
    """Deleting another user's key yields the same 404 as a nonexistent id
    (authorization is indistinguishable from absence), and the test user's own
    keys remain untouched."""
    other_key = api_key_project["other_user_key"]

    response = client.delete(f"/api-keys/delete/{other_key.id}")

    assert response.status_code == 404, response.text
    assert "API Key not found." in response.text

    response = client.get("/api-keys/list")
    assert response.status_code == 200, response.text
    keys = [ApiKeyRead.model_validate(x) for x in response.json()]
    assert {k.id for k in keys} == {
        api_key_project["user_key_expiring"].id,
        api_key_project["user_key_never"].id,
    }


# ===========================================================================
# MCP CONFIG (/api-keys/mcp-config) TESTS
# ===========================================================================


def test_get_mcp_config_returns_client_configuration(client: TestClient):
    """The unauthenticated mcp-config endpoint returns the npx mcp-remote
    configuration pointing at the server's /mcp URL with a placeholder key."""
    response = client.get("/api-keys/mcp-config")

    assert response.status_code == 200, response.text
    config = response.json()["dats-mcp-server"]
    assert config["command"] == "npx"
    args = config["args"]
    assert "mcp-remote" in args
    assert any(isinstance(arg, str) and arg.endswith("/mcp") for arg in args)
    assert "Authorization: Bearer API_KEY_HERE" in args
