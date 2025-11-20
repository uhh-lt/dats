from urllib.parse import quote
from uuid import uuid4

import pytest
from test.api.endpoints.test_stories import text_doc1


# Test Create Project
@pytest.mark.api
def test_create_project_basic(client, api_user):
    user = api_user.create("alice")

    payload = {
        "title": f"MyTestProject-{uuid4().hex[:6]}",
        "description": "Initial test",
    }
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


# Test UPDATE PATCH /project/{id}
@pytest.mark.api
def test_update_project_title_ok(client, api_user, api_project):
    u = api_user.create("upd_title_ok")
    p = api_project.create(u, "Before")

    r = client.patch(
        f"/project/{p['id']}", headers=u["AuthHeader"], json={"title": "After"}
    )

    assert r.status_code == 200
    body = r.json()
    assert body["id"] == p["id"]
    assert body["title"] == "After"
    # Beschreibung sollte unverändert bleiben
    assert body["description"] == p["description"]


@pytest.mark.api
def test_update_project_description_only_ok(client, api_user, api_project):
    u = api_user.create("upd_desc_ok")
    p = api_project.create(u, "KeepTitle")

    payload = {"description": "New description"}

    r = client.patch(f"/project/{p['id']}", headers=u["AuthHeader"], json=payload)

    assert r.status_code == 200
    body = r.json()
    assert body["id"] == p["id"]
    assert body["title"] == p["title"]  # Titel bleibt unverändert
    assert body["description"] == "New description"


@pytest.mark.api
def test_update_project_invalid_type_422(client, api_user, api_project):
    u = api_user.create("upd_422")
    p = api_project.create(u, "TitleOK")

    # Ungültiger Typ (int statt string) sollte sicher 422 triggern
    r = client.patch(
        f"/project/{p['id']}", headers=u["AuthHeader"], json={"title": 123}
    )

    assert r.status_code == 422


@pytest.mark.api
def test_update_project_forbidden_or_hidden(client, api_user, api_project):
    owner = api_user.create("upd_owner")
    stranger = api_user.create("upd_stranger")
    unique_title = f"PrivateProject-{uuid4().hex[:8]}"
    p = api_project.create(owner, unique_title)

    r = client.patch(
        f"/project/{p['id']}",
        headers=stranger["AuthHeader"],
        json={"title": "ShouldNotWork"},
    )
    assert r.status_code in (403, 404)


# Test DELETE DELETE /project/{id}
@pytest.mark.api
def test_delete_project_ok(client, api_user, api_project):
    u = api_user.create("del_ok")
    p = api_project.create(u, "ToDelete")

    r = client.delete(f"/project/{p['id']}", headers=u["AuthHeader"])

    assert r.status_code == 200
    # zweiter Versuch -> 404/403
    r2 = client.delete(f"/project/{p['id']}", headers=u["AuthHeader"])
    assert r2.status_code == 404


@pytest.mark.api
def test_delete_project_forbidden(client, api_user, api_project):
    owner = api_user.create("del_owner")
    stranger = api_user.create("del_stranger")
    p = api_project.create(owner, "PrivateDel")

    r = client.delete(f"/project/{p['id']}", headers=stranger["AuthHeader"])

    assert r.status_code in (403, 404)


# Test RESOLVE GET /project/{proj_id}/resolve_filename/{filename}
@pytest.mark.api
def test_resolve_filename_ok(client, api_user, api_project, api_document):
    u = api_user.create("resolve_ok_user")
    proj = api_project.create(u, "ResolveOK")

    api_document.upload_files([text_doc1], u, proj)

    fname = text_doc1[1]  # Turing-Test aus Stories
    r = client.get(
        f"/project/{proj['id']}/resolve_filename/{quote(fname, safe='')}",
        headers=u["AuthHeader"],
    )

    assert r.status_code == 200
    sdoc_id = r.json()
    assert isinstance(sdoc_id, int)


@pytest.mark.api
def test_resolve_filename_not_found(client, api_user, api_project):
    u = api_user.create("resolve_notfound_user")
    proj = api_project.create(u, "ResolveMissing")

    r = client.get(
        f"/project/{proj['id']}/resolve_filename/{quote('does_not_exist.txt', safe='')}",
        headers=u["AuthHeader"],
    )

    assert r.status_code == 404
    assert "SourceDocument" in r.text or "There exists no" in r.text


@pytest.mark.api
def test_resolve_filename_forbidden(client, api_user, api_project, api_document):
    owner = api_user.create("resolve_owner")
    stranger = api_user.create("resolve_stranger")
    proj = api_project.create(owner, "ResolvePrivate")

    api_document.upload_files([text_doc1], owner, proj)
    fname = text_doc1[1]

    r = client.get(
        f"/project/{proj['id']}/resolve_filename/{quote(fname, safe='')}",
        headers=stranger["AuthHeader"],
    )

    assert r.status_code in (403, 404)


# --- GET /project/user/projects ---


@pytest.mark.api
def test_get_user_projects_empty(client, api_user):
    u = api_user.create("no_projects_yet")

    r = client.get("/project/user/projects", headers=u["AuthHeader"])

    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.api
def test_get_user_projects_multiple(client, api_user, api_project):
    u = api_user.create("multi_proj_user")
    p1 = api_project.create(u, f"P1-{uuid4().hex[:4]}")
    p2 = api_project.create(u, f"P2-{uuid4().hex[:4]}")

    r = client.get("/project/user/projects", headers=u["AuthHeader"])

    assert r.status_code == 200
    ids = {proj["id"] for proj in r.json()}
    assert {p1["id"], p2["id"]}.issubset(ids)


# --- GET /project/{id}/sdoc/status/{status} ---


@pytest.mark.api
def test_count_sdocs_status_empty_ok(client, api_user, api_project):
    u = api_user.create("count_ok_user")
    p = api_project.create(u, "CountOK")

    r = client.get(f"/project/{p['id']}/sdoc/status/1", headers=u["AuthHeader"])

    assert r.status_code == 200
    assert r.json() == 0


@pytest.mark.api
def test_count_sdocs_status_forbidden(client, api_user, api_project):
    owner = api_user.create("count_owner")
    stranger = api_user.create("count_stranger")
    p = api_project.create(owner, "CountPrivate")

    r = client.get(f"/project/{p['id']}/sdoc/status/1", headers=stranger["AuthHeader"])

    assert r.status_code in (403, 404)
