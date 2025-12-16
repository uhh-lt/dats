from fastapi.testclient import TestClient
from test.factories.project_factory import ProjectFactory
from test.factories.project_metadata_factory import ProjectMetadataFactory

from common.doc_type import DocType
from common.meta_type import MetaType
from core.metadata.project_metadata_dto import (
    ProjectMetadataCreate,
    ProjectMetadataUpdate,
)
from core.user.user_dto import UserRead


def test_create_new_metadata(
    client: TestClient, project_factory: ProjectFactory, test_user: UserRead
):
    project = project_factory.create(creating_user_id=test_user.id)
    payload = ProjectMetadataCreate(
        project_id=project.id,
        key="new_field",
        metatype=MetaType.BOOLEAN,
        read_only=False,
        doctype=list(DocType)[0],
        description="A brand new metadata field",
    )
    resp = client.put("/projmeta", json=payload.model_dump())

    assert resp.status_code == 200


def test_create_new_metadata_if_not_exsists(client: TestClient):
    payload = ProjectMetadataCreate(
        project_id=99999,
        key="test_forbidden",
        metatype=MetaType.STRING,
        read_only=False,
        doctype=list(DocType)[0],
        description="Forbidden test",
    )
    resp = client.put("/projmeta", json=payload.model_dump())

    assert resp.status_code == 403


def test_get_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    project_metadata_factory: ProjectMetadataFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    meta = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key="category",
            metatype=MetaType.STRING,
            read_only=False,
            doctype=list(DocType)[0],
            description="read-write",
        )
    )
    resp = client.get(f"/projmeta/{meta.id}")

    assert resp.status_code == 200


def test_get_by_id_if_not_exsists(client: TestClient):
    resp = client.get("/projmeta/99999")

    assert resp.status_code == 403


def test_get_by_project(
    client: TestClient,
    project_factory: ProjectFactory,
    project_metadata_factory: ProjectMetadataFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key="category",
            metatype=MetaType.STRING,
            read_only=False,
            doctype=list(DocType)[0],
            description="x",
        )
    )
    project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key="status",
            metatype=MetaType.STRING,
            read_only=True,
            doctype=list(DocType)[0],
            description="y",
        )
    )

    resp = client.get(f"/projmeta/project/{project.id}")

    assert resp.status_code == 200


def test_get_by_project_if_not_exsists(client: TestClient):
    resp = client.get("/projmeta/project/777777")

    assert resp.status_code == 403


def test_update_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    project_metadata_factory: ProjectMetadataFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    meta = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key="category",
            metatype=MetaType.STRING,
            read_only=False,
            doctype=list(DocType)[0],
            description="old",
        )
    )

    payload = ProjectMetadataUpdate(description="Updated", key="new_key")

    resp = client.patch(
        f"/projmeta/{meta.id}", json=payload.model_dump(exclude_none=True)
    )

    assert resp.status_code == 200


def test_update_by_id_if_not_exsist(
    client: TestClient,
):
    payload = ProjectMetadataUpdate(description="Updated", key="new_key")
    non_exsist_id = 99999

    resp = client.patch(
        f"/projmeta/{non_exsist_id}", json=payload.model_dump(exclude_none=True)
    )
    assert resp.status_code == 403


def test_update_read_only(
    client: TestClient,
    project_factory: ProjectFactory,
    project_metadata_factory: ProjectMetadataFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    ro_meta = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key="status",
            metatype=MetaType.STRING,
            read_only=True,
            doctype=list(DocType)[0],
            description="original",
        )
    )
    payload = ProjectMetadataUpdate(key="ignored_key_change")

    resp = client.patch(
        f"/projmeta/{ro_meta.id}", json=payload.model_dump(exclude_none=True)
    )

    assert resp.status_code == 200


def test_update_read_only_if_not_exsists(
    client: TestClient,
):
    payload = ProjectMetadataUpdate(key="Key of the ProjectMetadata")

    non_exsist_id = 99999
    resp = client.patch(
        f"/projmeta/{non_exsist_id}", json=payload.model_dump(exclude_none=True)
    )
    assert resp.status_code == 403


def test_delete_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    project_metadata_factory: ProjectMetadataFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)

    meta = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key="to_delete",
            metatype=MetaType.STRING,
            read_only=False,
            doctype=list(DocType)[0],
            description="z",
        )
    )

    resp = client.delete(f"/projmeta/{meta.id}")

    assert resp.status_code == 200


def test_delete_by_id_if_not_exsists(
    client: TestClient,
):
    non_exsist_id = 99999
    resp = client.delete(f"/projmeta/{non_exsist_id}")

    assert resp.status_code == 403
