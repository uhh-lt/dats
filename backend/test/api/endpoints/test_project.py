import pytest


# Test Create Project
@pytest.mark.api
def test_create_project_basic(client, api_user):
    user = api_user.create("alice")

    payload = {"title": "MyTestProject", "description": "Initial test"}
    response = client.put("/project", headers=user["AuthHeader"], json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["title"] == payload["title"]
    assert data["description"] == payload["description"]


# Test READ GET /project/{id}
@pytest.mark.api
def test_read_project_ok(client, api_user, api_project):
    u = api_user.create("read_ok_user")
    proj = api_project.create(u, "ReadOK")

    r = client.get(f"/project/{proj['id']}", headers=u["AuthHeader"])

    assert r.status_code == 200
    body = r.json()
    assert body["id"] == proj["id"]
    assert body["title"] == proj["title"]
    assert body["description"] == proj["description"]


@pytest.mark.api
def test_read_project_forbidden_or_hidden(client, api_user, api_project):
    owner = api_user.create("read_owner")
    stranger = api_user.create("read_stranger")
    proj = api_project.create(owner, "PrivateProject")

    r = client.get(f"/project/{proj['id']}", headers=stranger["AuthHeader"])

    assert r.status_code in (403, 404)


@pytest.mark.api
def test_read_project_not_found_or_forbidden(client, api_user):
    u = api_user.create("read_notfound")

    r = client.get("/project/999999999", headers=u["AuthHeader"])

    assert r.status_code in (403, 404)


# FIXME: Test UPDATE PATCH /project/{id}


# FIXME: Test DELETE DELETE /project/{id}


# FIXME: Test RESOLVE GET /project/{id}/resolve_filename/{filename} -- monkeypatch?


# FIXME: Test USER PROJECTS GET /project/user/projects


# FIXME: Test GET /project/{id}/sdoc/status/{status} -- count status


# FIXME: Test GET /project/{id}/sdoc/status/{status} -- count status


# FIXME: Test GET /project/{id}/sdoc/status/{status} -- count status
