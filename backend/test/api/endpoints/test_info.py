import pytest

from config import conf


@pytest.mark.api
def test_heartbeat_ok(client):
    r = client.get("/heartbeat")
    assert r.status_code == 200
    assert r.json() is True


@pytest.mark.api
def test_info_ok(client):
    r = client.get("/info")
    assert r.status_code == 200
    data = r.json()
    assert data["is_oidc_enabled"] == (conf.api.auth.oidc.enabled == "True")
    assert data["oidc_provider_name"] == conf.api.auth.oidc.name
    assert data["is_stable"] == (conf.api.is_stable == "True")


@pytest.mark.api
def test_root_redirects_to_docs(client):
    r = client.get("/", follow_redirects=False)
    assert r.status_code in (302, 307)
    assert r.headers.get("location") == "/docs"
