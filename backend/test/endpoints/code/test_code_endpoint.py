import pytest
from fastapi.testclient import TestClient

from core.code.code_dto import CodeCreate, CodeRead, CodeUpdate, CodeUpdateBulk


def test_create_new_code(client: TestClient, test_project):
    project = test_project

    payload = CodeCreate(
        name="New Test",
        color="Red",
        description="Hallo here is the new test",
        parent_id=None,
        enabled=True,
        project_id=project.id,
        is_system=False,
    )
    response = client.put("/code", json=payload.model_dump())

    assert response.status_code == 200, response.text
    code = CodeRead.model_validate(response.json())
    assert payload.name == code.name
    assert payload.color == code.color
    assert payload.description == code.description
    assert payload.parent_id == code.parent_id
    assert payload.enabled == code.enabled
    assert payload.project_id == code.project_id
    assert payload.is_system == code.is_system


def test_create_code_project_not_existing(
    client: TestClient,
):
    non_existing_project_id = 99999
    payload = CodeCreate(
        name="Wrong Project Test",
        color="Green",
        description="Trying to create code in a non-existing project",
        parent_id=None,
        enabled=True,
        project_id=non_existing_project_id,
        is_system=False,
    )
    response = client.put("/code", json=payload.model_dump())

    assert response.status_code == 403, response.text


def test_get_code(
    client: TestClient,
    project_with_code,
):
    code = project_with_code["code"]

    response = client.get(f"/code/{code.id}")

    assert response.status_code == 200, response.text
    code_read = CodeRead.model_validate(response.json())
    assert code.name == code_read.name
    assert code.color == code_read.color
    assert code.description == code_read.description
    assert code.parent_id == code_read.parent_id
    assert code.enabled == code_read.enabled
    assert code.project_id == code_read.project_id
    assert code.is_system == code_read.is_system


def test_get_code_does_not_exist(
    client: TestClient,
):
    non_existing_id = 999999999

    response = client.get(f"/code/{non_existing_id}")
    assert response.status_code == 403, response.text


testdata = [
    pytest.param({"name": "New Name", "color": "blue"}, id="name_and_color"),
    pytest.param({"description": "New Description"}, id="only_description"),
    pytest.param({"enabled": False}, id="toggle_enabled"),
    pytest.param({"parent_id": None}, id="clear_parent"),
]


@pytest.mark.parametrize("payload", testdata)
def test_update_code_parametrize(
    client: TestClient,
    project_with_code,
    payload: dict,
) -> None:
    code = project_with_code["code"]
    project = project_with_code["project"]

    response = client.patch(f"/code/{code.id}", json=payload)

    assert response.status_code == 200, response.text
    updated = CodeRead.model_validate(response.json())
    assert updated.name == payload.get("name", code.name)
    assert updated.color == payload.get("color", code.color)
    assert updated.description == payload.get("description", code.description)
    assert updated.enabled == payload.get("enabled", code.enabled)
    assert updated.id == code.id
    assert updated.project_id == project.id


def test_update_by_id_alt(
    client: TestClient,
    project_with_parent_and_child_code,
):
    code = project_with_parent_and_child_code["code"]

    update = CodeUpdate(
        name="new Update Code",
        color="blue",
        description="here is the updated Code",
        parent_id=None,
        enabled=False,
    )
    response = client.patch(f"/code/{code.id}", json=update.model_dump())

    assert response.status_code == 200, response.text
    updated = CodeRead.model_validate(response.json())
    assert updated.name == update.name
    assert updated.color == update.color
    assert updated.description == update.description
    assert updated.parent_id == update.parent_id
    assert updated.enabled == update.enabled


def test_update_by_id_not_existing(
    client: TestClient,
):
    non_existing_code_id = 999999999
    update = CodeUpdate(
        name="new Update Code",
        color="blue",
        description="here is the updated Code",
        parent_id=None,
        enabled=False,
    )
    response = client.patch(
        f"/code/{non_existing_code_id}",
        json=update.model_dump(exclude_unset=True),
    )

    assert response.status_code == 403, response.text


def test_delete_code(
    client: TestClient,
    project_with_code,
):
    code = project_with_code["code"]

    response = client.delete(f"/code/{code.id}")

    assert response.status_code == 200, response.text
    code_delete = CodeRead.model_validate(response.json())
    assert code.name == code_delete.name
    assert code.color == code_delete.color
    assert code.description == code_delete.description
    assert code.parent_id == code_delete.parent_id
    assert code.enabled == code_delete.enabled
    assert code.project_id == code_delete.project_id
    assert code.is_system == code_delete.is_system


def test_delete_code_not_existing(
    client: TestClient,
):
    non_existing_id = 99999999
    response = client.delete(f"/code/{non_existing_id}")

    assert response.status_code == 403, response.text


def test_get_by_project(
    client: TestClient,
    project_with_code,
):
    project = project_with_code["project"]

    response = client.get(f"/code/project/{project.id}")

    EXPECTED_COUNT = 136
    assert response.status_code == 200, response.text
    codes_json = response.json()
    assert len(codes_json) == EXPECTED_COUNT


def test_get_by_project_not_existing(
    client: TestClient,
):
    non_existing_project_id = 999999
    response = client.get(f"/code/project/{non_existing_project_id}")

    assert response.status_code == 403, response.text


def test_disable_parent_code_disables_children(
    client: TestClient,
    project_with_code_hierarchy,
):
    """Disabling a code must disable all its descendants."""
    grandparent = project_with_code_hierarchy["grandparent_code"]
    parent = project_with_code_hierarchy["parent_code"]
    child = project_with_code_hierarchy["child_code"]

    response = client.patch(f"/code/{grandparent.id}", json={"enabled": False})

    assert response.status_code == 200, response.text
    updated = CodeRead.model_validate(response.json())
    assert updated.enabled is False

    # descendants must be disabled as well
    response = client.get(f"/code/{parent.id}")
    assert response.status_code == 200, response.text
    assert CodeRead.model_validate(response.json()).enabled is False

    response = client.get(f"/code/{child.id}")
    assert response.status_code == 200, response.text
    assert CodeRead.model_validate(response.json()).enabled is False


def test_enable_child_code_enables_disabled_ancestors(
    client: TestClient,
    project_with_code_hierarchy,
):
    """Enabling a code must enable all its disabled ancestors, so that the
    code is reachable from the top of the hierarchy."""
    grandparent = project_with_code_hierarchy["grandparent_code"]
    parent = project_with_code_hierarchy["parent_code"]
    child = project_with_code_hierarchy["child_code"]

    # disable the grandparent, which disables the whole subtree
    response = client.patch(f"/code/{grandparent.id}", json={"enabled": False})
    assert response.status_code == 200, response.text

    # now enable the child code
    response = client.patch(f"/code/{child.id}", json={"enabled": True})
    assert response.status_code == 200, response.text
    updated = CodeRead.model_validate(response.json())
    assert updated.enabled is True

    # all ancestors must be enabled as well
    response = client.get(f"/code/{parent.id}")
    assert response.status_code == 200, response.text
    assert CodeRead.model_validate(response.json()).enabled is True

    response = client.get(f"/code/{grandparent.id}")
    assert response.status_code == 200, response.text
    assert CodeRead.model_validate(response.json()).enabled is True


def test_enable_child_code_keeps_enabled_ancestors(
    client: TestClient,
    project_with_code_hierarchy,
):
    """Enabling a code whose ancestors are already enabled must not change them."""
    parent = project_with_code_hierarchy["parent_code"]
    child = project_with_code_hierarchy["child_code"]

    # disable only the child
    response = client.patch(f"/code/{child.id}", json={"enabled": False})
    assert response.status_code == 200, response.text

    # re-enable the child
    response = client.patch(f"/code/{child.id}", json={"enabled": True})
    assert response.status_code == 200, response.text
    assert CodeRead.model_validate(response.json()).enabled is True

    # the parent must still be enabled
    response = client.get(f"/code/{parent.id}")
    assert response.status_code == 200, response.text
    assert CodeRead.model_validate(response.json()).enabled is True


# ===========================================================================
# UPDATE CODES BULK (/code/bulk/update) TESTS
# ===========================================================================


def test_update_codes_bulk_updates_each_code(
    client: TestClient, project_with_parent_and_child_code
):
    """Every code gets its own changes; the results keep the request order and the
    fields that were not sent stay unchanged."""
    parent = project_with_parent_and_child_code["parent_code"]
    child = project_with_parent_and_child_code["code"]
    request = [
        CodeUpdateBulk(code_id=child.id, name="Renamed Child", description="new"),
        CodeUpdateBulk(code_id=parent.id, description="new parent description"),
    ]

    response = client.patch(
        "/code/bulk/update",
        json=[update.model_dump(exclude_unset=True) for update in request],
    )

    assert response.status_code == 200, response.text
    codes = [CodeRead.model_validate(code) for code in response.json()]
    assert [code.id for code in codes] == [child.id, parent.id]
    assert (codes[0].name, codes[0].description) == ("Renamed Child", "new")
    assert (codes[1].name, codes[1].description) == (
        "Parent Code",
        "new parent description",
    )
    assert codes[0].color == "Green"
    assert codes[0].parent_id == parent.id


def test_update_codes_bulk_disabling_a_code_disables_its_descendants(
    client: TestClient, project_with_code_hierarchy
):
    """A bulk update applies the same enabled cascade as the single update."""
    grandparent = project_with_code_hierarchy["grandparent_code"]
    child = project_with_code_hierarchy["child_code"]

    response = client.patch(
        "/code/bulk/update", json=[{"code_id": grandparent.id, "enabled": False}]
    )

    assert response.status_code == 200, response.text
    response = client.get(f"/code/{child.id}")
    assert response.status_code == 200, response.text
    assert CodeRead.model_validate(response.json()).enabled is False


def test_update_codes_bulk_accepts_an_empty_list(client: TestClient):
    """An empty bulk update changes nothing and returns no codes."""
    response = client.patch("/code/bulk/update", json=[])

    assert response.status_code == 200, response.text
    assert response.json() == []


def test_update_codes_bulk_rejects_a_taken_name_without_changes(
    client: TestClient, project_with_parent_and_child_code
):
    """Code names are unique per project: a taken name fails the whole update
    with 409, and no code of the request is changed."""
    parent = project_with_parent_and_child_code["parent_code"]
    child = project_with_parent_and_child_code["code"]

    response = client.patch(
        "/code/bulk/update",
        json=[
            {"code_id": parent.id, "description": "changed"},
            {"code_id": child.id, "name": "Parent Code"},
        ],
    )

    assert response.status_code == 409, response.text
    response = client.get(f"/code/{parent.id}")
    assert response.status_code == 200, response.text
    assert CodeRead.model_validate(response.json()).description == (
        "Parent code for testing"
    )


def test_update_codes_bulk_rejects_duplicate_ids(client: TestClient, project_with_code):
    """A code may appear only once per bulk update."""
    code = project_with_code["code"]

    response = client.patch(
        "/code/bulk/update",
        json=[
            {"code_id": code.id, "name": "A"},
            {"code_id": code.id, "name": "B"},
        ],
    )

    assert response.status_code == 400, response.text


def test_update_codes_bulk_rejects_an_update_without_changes(
    client: TestClient, project_with_code
):
    """Every item must change at least one field."""
    code = project_with_code["code"]

    response = client.patch("/code/bulk/update", json=[{"code_id": code.id}])

    assert response.status_code == 422, response.text


def test_update_codes_bulk_rejects_unknown_codes(client: TestClient, project_with_code):
    """A code that does not exist (or belongs to a foreign project) is forbidden."""
    code = project_with_code["code"]

    response = client.patch(
        "/code/bulk/update",
        json=[
            {"code_id": code.id, "name": "Renamed"},
            {"code_id": 999999, "name": "Unknown"},
        ],
    )

    assert response.status_code == 403, response.text
