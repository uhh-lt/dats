from fastapi.testclient import TestClient
from test.factories.code_factory import CodeFactory
from test.factories.project_factory import ProjectFactory

from core.code.code_dto import CodeCreate, CodeRead, CodeUpdate
from core.user.user_dto import UserRead


def test_create_new_code(
    client: TestClient, project_factory: ProjectFactory, test_user: UserRead
):
    project = project_factory.create(creating_user_id=test_user.id)

    payload = CodeCreate(
        name="Neww Test",
        color="Red",
        description="Hallo here is the new test",
        parent_id=None,
        enabled=True,
        project_id=project.id,
        is_system=False,
    )

    response = client.put("/code", json=payload.model_dump())

    assert response.status_code == 200
    code = CodeRead.model_validate(response.json())
    assert payload.name == code.name
    assert payload.color == code.color
    assert payload.description == code.description
    assert payload.parent_id == code.parent_id
    assert payload.enabled == code.enabled
    assert payload.project_id == code.project_id
    assert payload.is_system == code.is_system


# Test create code in a project that does not exist!


def test_create_code_project_not_existing(
    client: TestClient,
    test_user: UserRead,
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

    assert response.status_code == 403


def test_get_code(
    client: TestClient,
    project_factory: ProjectFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    code = code_factory.create(
        create_dto=CodeCreate(
            name="Test Code for Retrieval",
            color="Red",
            description="Hallo here is the new test",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    response = client.get(f"/code/{code.id}")

    assert response.status_code == 200
    code_read = CodeRead.model_validate(response.json())
    assert code.name == code_read.name
    assert code.color == code_read.color
    assert code.description == code_read.description
    assert code.parent_id == code_read.parent_id
    assert code.enabled == code_read.enabled
    assert code.project_id == code_read.project_id
    assert code.is_system == code_read.is_system


# Test get code that does not exist


def test_get_code_does_not_exist(
    client: TestClient,
    project_factory: ProjectFactory,
    test_user: UserRead,
):
    project_factory.create(creating_user_id=test_user.id)
    non_existing_id = 999999999

    response = client.get(f"/code/{non_existing_id}")
    assert response.status_code == 403


# TEST update code


def test_update_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    code = code_factory.create(
        CodeCreate(
            name="current Code",
            color="red",
            description="here is current updated Code",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=True,
        )
    )
    update = CodeUpdate(
        name="new Update Code",
        color="blue",
        description="here is the updated Code",
        parent_id=1,
        enabled=False,
    )
    response = client.patch(f"/code/{code.id}", json=update.model_dump())

    assert response.status_code == 200
    updated = CodeRead.model_validate(response.json())
    assert updated.name == update.name
    assert updated.color == update.color
    assert updated.description == update.description
    assert updated.parent_id == update.parent_id
    assert updated.enabled == update.enabled


def test_update_by_id_not_existing(
    client: TestClient,
    project_factory: ProjectFactory,
    test_user: UserRead,
):
    project_factory.create(creating_user_id=test_user.id)
    non_existing_code_id = 999_999_999
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

    assert response.status_code == 403


def test_delete_code(
    client: TestClient,
    project_factory: ProjectFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    code = code_factory.create(
        create_dto=CodeCreate(
            name="Test Code for Retrieval",
            color="Red",
            description="Hallo here is the new test",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    response = client.delete(f"/code/{code.id}")

    assert response.status_code == 200
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
    project_factory: ProjectFactory,
    test_user: UserRead,
):
    project_factory.create(creating_user_id=test_user.id)
    non_existing_id = 999999999

    response = client.delete(f"/code/{non_existing_id}")

    assert response.status_code == 403


def test_get_by_project(
    client: TestClient,
    project_factory: ProjectFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)

    EXPECTED_COUNT = 136

    code_factory.create(
        create_dto=CodeCreate(
            name="Test Code",
            color="Red",
            description="Test code for project retrieval",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    response = client.get(f"/code/project/{project.id}")

    assert response.status_code == 200
    codes_json = response.json()
    assert len(codes_json) == EXPECTED_COUNT


def test_get_by_project_not_existing(
    client: TestClient,
    project_factory: ProjectFactory,
    test_user: UserRead,
):
    project_factory.create(creating_user_id=test_user.id)
    non_existing_project_id = 999999

    response = client.get(f"/code/project/{non_existing_project_id}")

    assert response.status_code == 403
