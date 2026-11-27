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
# CONTENT (GET /authentication/content) TESTS
# ===========================================================================

# --- A. virtual users ---------------------------------------------------------


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
    project_id = virtual_user_project["project"].id
    client.cookies.set("Authorization", api_key)

    response = client.get(
        "/authentication/content",
        headers={"X-Original-URI": f"/content/projects/{project_id}/sdocs/1/a.txt"},
    )

    assert response.status_code == expected_status, response.text


# --- B. content paths --------------------------------------------------------
# nginx asks `/authentication/content` with the raw request URI
# (`X-Original-URI`) before it serves a file below `/content/`. Only the files
# of the user's own projects are served; every other path is denied with 403
# (nginx `auth_request` treats any status but 2xx, 401 and 403 as an error).


@pytest.mark.parametrize(
    "uri_template,expected_status",
    [
        # a file of the user's own project
        pytest.param("/content/projects/{own}/sdocs/1/a.txt", 200, id="own-project"),
        # a query string is no part of the served path
        pytest.param(
            "/content/projects/{own}/exports/1/a.csv?x=../{other}", 200, id="query"
        ),
        # a file of a project the user is no member of
        pytest.param(
            "/content/projects/{other}/sdocs/1/a.txt", 403, id="outsider-project"
        ),
        # files outside `projects/` are never served
        pytest.param("/content/temporary_files/1/a.zip", 403, id="temporary-file"),
        pytest.param("/content/logs/a.log", 403, id="non-project-path"),
        pytest.param("/content/projects/", 403, id="no-project-id"),
        pytest.param("/somewhere/else", 403, id="not-content"),
        # the project id is no number
        pytest.param("/content/projects/abc/sdocs/1/a.txt", 403, id="malformed-id"),
        pytest.param("/content/projects/{own}", 403, id="no-file"),
        # nginx resolves dot segments, so the checked project would not be the
        # served one
        pytest.param(
            "/content/projects/{own}/../{other}/sdocs/1/a.txt", 403, id="traversal"
        ),
        pytest.param(
            "/content/projects/{own}/%2e%2e/{other}/sdocs/1/a.txt",
            403,
            id="encoded-traversal",
        ),
        pytest.param("/content/projects/{own}/./sdocs/1/a.txt", 403, id="dot-segment"),
    ],
)
def test_content_auth_serves_only_own_project_files(
    client: TestClient,
    virtual_user_project: VirtualUserProject,
    uri_template: str,
    expected_status: int,
):
    """`/authentication/content` allows exactly the paths below
    `/content/projects/<id>/` of a project of the user."""
    uri = uri_template.format(
        own=virtual_user_project["project"].id,
        other=virtual_user_project["outsider_project"].id,
    )
    client.cookies.set("Authorization", virtual_user_project["user_api_key"])

    response = client.get("/authentication/content", headers={"X-Original-URI": uri})

    assert response.status_code == expected_status, response.text


def test_content_auth_denies_request_without_original_uri(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """Without the `X-Original-URI` header nginx sets, nothing is allowed."""
    client.cookies.set("Authorization", virtual_user_project["user_api_key"])

    response = client.get("/authentication/content")

    assert response.status_code == 403, response.text
