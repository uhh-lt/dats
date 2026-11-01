import pytest
from fastapi.testclient import TestClient

from virtual_user_test_utils import VirtualUserProject

# ===========================================================================
# LOGIN (POST /authentication/login) TESTS: VIRTUAL USERS
# ===========================================================================


@pytest.mark.parametrize(
    "password_key",
    [
        # even the stored password (no valid hash) does not log in
        pytest.param("stored", id="stored-password"),
        pytest.param("other", id="other-password"),
    ],
)
def test_login_as_virtual_user_is_rejected(
    client: TestClient, virtual_user_project: VirtualUserProject, password_key: str
):
    """Virtual users can never log in, whatever the password."""
    run1 = virtual_user_project["run1"]
    password = run1.password if password_key == "stored" else "anything"

    response = client.post(
        "/authentication/login", data={"username": run1.email, "password": password}
    )

    assert response.status_code == 403, response.text
    assert "access_token" not in response.text


# ===========================================================================
# CONTENT (GET /authentication/content) TESTS: VIRTUAL USERS
# ===========================================================================


@pytest.mark.parametrize(
    "key_name,expected_status",
    [
        # a human user's key authenticates
        pytest.param("user_api_key", 200, id="human-key"),
        # a virtual user's key is rejected, even if it exists
        pytest.param("run1_api_key", 403, id="virtual-user-key"),
    ],
)
def test_content_auth_rejects_virtual_user_api_key(
    client: TestClient,
    virtual_user_project: VirtualUserProject,
    key_name: str,
    expected_status: int,
):
    """`/authentication/content` authenticates by the cookie with the real token
    resolution (the test clients' header auth only replaces the bearer
    dependency), which rejects every token of a virtual user."""
    api_key: str = virtual_user_project[key_name]  # type: ignore[literal-required]
    client.cookies.set("Authorization", api_key)

    response = client.get("/authentication/content")

    assert response.status_code == expected_status, response.text
