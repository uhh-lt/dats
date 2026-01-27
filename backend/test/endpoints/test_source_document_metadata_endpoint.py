import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test.factories.project_factory import ProjectFactory
from test.factories.project_metadata_factory import ProjectMetadataFactory
from test.factories.source_document_factory import SourceDocumentFactory
from test.factories.source_document_metadata_factory import (
    SourceDocumentMetadataFactory,
)

from common.doc_type import DocType
from common.meta_type import MetaType
from core.doc.source_document_dto import (
    SourceDocumentCreate,
)
from core.metadata.project_metadata_dto import ProjectMetadataCreate
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataBulkUpdate,
    SourceDocumentMetadataCreate,
    SourceDocumentMetadataRead,
    SourceDocumentMetadataUpdate,
)
from core.user.user_dto import UserRead


def test_create_sdoc_metadata(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    project_metadata_factory: ProjectMetadataFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    pm = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key=f"status_{project.id}",
            metatype=MetaType.STRING,
            read_only=True,
            doctype=list(DocType)[0],
            description="original",
        )
    )

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Doc",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    payload = SourceDocumentMetadataCreate.with_metatype(
        source_document_id=sdoc.id,
        project_metadata_id=pm.id,
        metatype=MetaType.STRING,
        value="Politics",
    )

    resp = client.put("/sdocmeta", json=payload.model_dump())
    assert resp.status_code == 200

    body = SourceDocumentMetadataRead.model_validate(resp.json())
    assert body.id > 0
    assert body.source_document_id == sdoc.id
    assert body.project_metadata_id == pm.id
    assert body.str_value == "Politics"
    assert body.int_value is None
    assert body.boolean_value is None
    assert body.date_value is None
    assert body.list_value is None


def test_create_sdoc_metadata_if_id_not_exsist(
    client: TestClient,
) -> None:
    not_exsist_id = 3000
    payload = SourceDocumentMetadataCreate(
        str_value="Politics",
        int_value=None,
        boolean_value=None,
        date_value=None,
        list_value=None,
        source_document_id=not_exsist_id,
        project_metadata_id=not_exsist_id,
    )
    resp = client.put("/sdocmeta", json=payload.model_dump())
    assert resp.status_code == 403


def test_create_sdoc_metadata_with_no_metadata(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    project_metadata_factory: ProjectMetadataFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    pm = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key=f"status_{project.id}",
            metatype=MetaType.STRING,
            read_only=True,
            doctype=list(DocType)[0],
            description="original",
        )
    )

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Doc",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    payload = SourceDocumentMetadataCreate(
        str_value="Politics",
        int_value=None,
        boolean_value=None,
        date_value=None,
        list_value=None,
        source_document_id=sdoc.id,
        project_metadata_id=pm.id,
    )
    resp = client.put("/sdocmeta", json=payload.model_dump())
    assert resp.status_code == 200

    body = SourceDocumentMetadataRead.model_validate(resp.json())
    assert body.id > 0
    assert body.source_document_id == sdoc.id
    assert body.project_metadata_id == pm.id
    assert body.str_value == "Politics"
    assert body.int_value is None
    assert body.boolean_value is None
    assert body.date_value is None
    assert body.list_value is None


def test_get_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    project_metadata_factory: ProjectMetadataFactory,
    source_document_metadata_factory: SourceDocumentMetadataFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)

    pm = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key=f"category_{project.id}",
            metatype=MetaType.STRING,
            read_only=False,
            doctype=list(DocType)[0],
            description="read-write",
        )
    )

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Doc",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    metadata = source_document_metadata_factory.create(
        create_dto=SourceDocumentMetadataCreate(
            str_value="Politics",
            int_value=None,
            boolean_value=None,
            date_value=None,
            list_value=None,
            project_metadata_id=pm.id,
            source_document_id=sdoc.id,
        )
    )

    resp = client.get(f"/sdocmeta/{metadata.id}")
    assert resp.status_code == 200

    body = SourceDocumentMetadataRead.model_validate(resp.json())
    assert body.id == metadata.id
    assert body.source_document_id == sdoc.id
    assert body.project_metadata_id == pm.id
    assert body.str_value == "Politics"
    assert body.int_value is None
    assert body.boolean_value is None
    assert body.date_value is None
    assert body.list_value is None


def test_get_by_id_if_not_exsist(
    client: TestClient,
) -> None:
    fake_id = 3000
    resp = client.get(f"/sdocmeta/{fake_id}")
    assert resp.status_code == 403


def test_get_by_sdoc(
    client: TestClient,
    db_session: Session,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    project_metadata_factory: ProjectMetadataFactory,
    source_document_metadata_factory: SourceDocumentMetadataFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    pm = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key=f"category_{project.id}",
            metatype=MetaType.STRING,
            read_only=False,
            doctype=list(DocType)[0],
            description="read-write",
        )
    )

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Doc",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    meta = source_document_metadata_factory.create(
        create_dto=SourceDocumentMetadataCreate(
            str_value="Politics",
            int_value=None,
            boolean_value=None,
            date_value=None,
            list_value=None,
            project_metadata_id=pm.id,
            source_document_id=sdoc.id,
        )
    )

    resp = client.get(f"/sdocmeta/sdoc/{sdoc.id}")

    assert resp.status_code == 200
    items = [SourceDocumentMetadataRead.model_validate(x) for x in resp.json()]
    assert len(items) == 1
    got = items[0]
    assert got.id == meta.id
    assert got.source_document_id == sdoc.id
    assert got.project_metadata_id == pm.id
    assert got.str_value == "Politics"
    assert got.int_value is None
    assert got.boolean_value is None
    assert got.date_value is None
    assert got.list_value is None


def test_get_by_sdoc_if_not_exsist(
    client: TestClient,
) -> None:
    fake_id = 3000
    resp = client.get(f"/sdocmeta/sdoc/{fake_id}")
    assert resp.status_code == 403


def test_get_by_sdoc_and_key(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    project_metadata_factory: ProjectMetadataFactory,
    source_document_metadata_factory: SourceDocumentMetadataFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    key = f"status{project.id}"
    pm = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key=key,
            metatype=MetaType.STRING,
            read_only=False,
            doctype=list(DocType)[0],
            description="x",
        )
    )

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Doc",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    meta = source_document_metadata_factory.create(
        create_dto=SourceDocumentMetadataCreate(
            str_value="Politics",
            int_value=None,
            boolean_value=None,
            date_value=None,
            list_value=None,
            project_metadata_id=pm.id,
            source_document_id=sdoc.id,
        )
    )

    resp = client.get(f"/sdocmeta/sdoc/{sdoc.id}/metadata/{key}")

    assert resp.status_code == 200
    body = SourceDocumentMetadataRead.model_validate(resp.json())
    assert body.id == meta.id
    assert body.source_document_id == sdoc.id
    assert body.project_metadata_id == pm.id
    assert body.str_value == "Politics"


def test_get_by_sdoc_and_key_if_not_exsist(
    client: TestClient,
) -> None:
    fake_id = 3000

    key = f"status{fake_id}"

    resp = client.get(f"/sdocmeta/sdoc/{fake_id}/metadata/{key}")
    assert resp.status_code == 403


test_data_metadata_update = [
    pytest.param(
        {"field": "str_value", "old": "Alt", "new": "Neu", "type": MetaType.STRING},
        id="update_string",
    ),
    pytest.param(
        {"field": "int_value", "old": 0, "new": 100, "type": MetaType.NUMBER},
        id="update_number",
    ),
    pytest.param(
        {"field": "boolean_value", "old": False, "new": True, "type": MetaType.BOOLEAN},
        id="update_boolean",
    ),
    pytest.param(
        {
            "field": "date_value",
            "old": "2020-01-01",
            "new": "2025-05-05",
            "type": MetaType.DATE,
        },
        id="update_date",
    ),
]


@pytest.mark.parametrize("payload_1", test_data_metadata_update)
def test_update_sdoc_metadata_parametrized(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    project_metadata_factory: ProjectMetadataFactory,
    source_document_metadata_factory: SourceDocumentMetadataFactory,
    test_user: UserRead,
    payload_1: dict,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)
    project_id = project.id

    pm = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project_id,
            key=f"key_{payload_1['field']}",
            metatype=payload_1["type"],
            read_only=False,
            doctype=DocType.text,
            description="read-write",
        )
    )
    pm_id = pm.id

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt", name="Doc", doctype=DocType.text, project_id=project_id
        )
    )
    sdoc_id = sdoc.id

    base = {
        k: None
        for k in ["str_value", "int_value", "boolean_value", "date_value", "list_value"]
    }

    init_values = {**base, payload_1["field"]: payload_1["old"]}
    metadata = source_document_metadata_factory.create(
        create_dto=SourceDocumentMetadataCreate(
            project_metadata_id=pm_id, source_document_id=sdoc_id, **init_values
        )
    )
    metadata_id = metadata.id

    payload = {**base, payload_1["field"]: payload_1["new"]}

    resp = client.patch(f"/sdocmeta/{metadata_id}", json=payload)

    assert resp.status_code == 200, f"Error: {resp.text}"
    updated = SourceDocumentMetadataRead.model_validate(resp.json())

    assert updated.id == metadata_id
    assert updated.project_metadata_id == pm_id
    assert updated.source_document_id == sdoc_id

    assert updated.str_value == payload.get("str_value")
    assert updated.int_value == payload.get("int_value")
    assert updated.boolean_value == payload.get("boolean_value")

    if updated.date_value:
        assert updated.date_value.strftime("%Y-%m-%d") == payload.get("date_value")
    else:
        assert updated.date_value == payload.get("date_value")


def test_update_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    project_metadata_factory: ProjectMetadataFactory,
    source_document_metadata_factory: SourceDocumentMetadataFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    pm = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key=f"category{project.id}",
            metatype=MetaType.STRING,
            read_only=False,
            doctype=DocType.text,
            description="read-write",
        )
    )
    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    metadata = source_document_metadata_factory.create(
        create_dto=SourceDocumentMetadataCreate(
            str_value="Politics",
            int_value=None,
            boolean_value=None,
            date_value=None,
            list_value=None,
            project_metadata_id=pm.id,
            source_document_id=sdoc.id,
        )
    )

    # TODO: WHY DO WE NEED no payload.model_dump(exclude_none=True)
    payload = SourceDocumentMetadataUpdate(
        str_value="Sports",
        int_value=None,
        date_value=None,
        list_value=None,
        boolean_value=None,
    )
    resp = client.patch(f"/sdocmeta/{metadata.id}", json=payload.model_dump())

    assert resp.status_code == 200, resp.json()

    updated = SourceDocumentMetadataRead.model_validate(resp.json())
    assert updated.str_value == "Sports"
    assert updated.int_value == metadata.int_value
    assert updated.date_value == metadata.date_value
    assert updated.boolean_value == metadata.boolean_value
    assert updated.project_metadata_id == pm.id
    assert updated.source_document_id == sdoc.id
    assert updated.list_value == metadata.list_value


def test_update_by_id_if_not_exsist(
    client: TestClient,
) -> None:
    fake_id = 3000
    payload = SourceDocumentMetadataUpdate(
        str_value="Sports",
        int_value=None,
        date_value=None,
        list_value=None,
        boolean_value=None,
    )

    resp = client.patch(f"/sdocmeta/{fake_id}", json=payload.model_dump())

    assert resp.status_code == 403


# TODO: WHY DO WE NEED no payload.model_dump(exclude_none=True)


test_data_bulk_metadata = [
    pytest.param(
        {
            "field": "str_value",
            "old": "Politics",
            "new": "Sports",
            "type": MetaType.STRING,
        },
        id="bulk_update_string",
    ),
    pytest.param(
        {"field": "int_value", "old": 10, "new": 20, "type": MetaType.NUMBER},
        id="bulk_update_number",
    ),
]


@pytest.mark.parametrize("payload_1", test_data_bulk_metadata)
def test_update_bulk_metadata_parametrized(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    project_metadata_factory: ProjectMetadataFactory,
    source_document_metadata_factory: SourceDocumentMetadataFactory,
    test_user: UserRead,
    payload_1: dict,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)
    project_id = project.id

    pm = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project_id,
            key=f"bulk_key_{payload_1['field']}",
            metatype=payload_1["type"],
            read_only=False,
            doctype=DocType.text,
            description="read-write",
        )
    )
    pm_id = pm.id

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt", name="Doc", doctype=DocType.text, project_id=project_id
        )
    )
    sdoc_id = sdoc.id

    base = {
        "str_value": None,
        "int_value": None,
        "boolean_value": None,
        "date_value": None,
        "list_value": None,
    }

    init_values = {**base, payload_1["field"]: payload_1["old"]}

    meta = source_document_metadata_factory.create(
        create_dto=SourceDocumentMetadataCreate(
            project_metadata_id=pm_id, source_document_id=sdoc_id, **init_values
        )
    )
    meta_id = meta.id

    payload = {**base, "id": meta_id, payload_1["field"]: payload_1["new"]}

    resp = client.patch("/sdocmeta/bulk/update", json=[payload])
    assert resp.status_code == 200, resp.json()

    updated = SourceDocumentMetadataRead.model_validate(resp.json()[0])

    assert updated.id == meta_id
    assert updated.source_document_id == sdoc_id
    assert updated.project_metadata_id == pm_id

    assert updated.str_value == payload.get("str_value")
    assert updated.int_value == payload.get("int_value")
    assert updated.boolean_value == payload.get("boolean_value")
    assert updated.date_value == payload.get("date_value")
    assert updated.list_value == payload.get("list_value")


def test_update_bulk(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    project_metadata_factory: ProjectMetadataFactory,
    source_document_metadata_factory: SourceDocumentMetadataFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    pm = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key=f"category{project.id}",
            metatype=MetaType.STRING,
            read_only=False,
            doctype=DocType.text,
            description="read-write",
        )
    )

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    meta = source_document_metadata_factory.create(
        create_dto=SourceDocumentMetadataCreate(
            str_value="Politics",
            int_value=None,
            boolean_value=None,
            date_value=None,
            list_value=None,
            project_metadata_id=pm.id,
            source_document_id=sdoc.id,
        )
    )

    payload = SourceDocumentMetadataBulkUpdate(
        id=meta.id,
        str_value="Sports",
        int_value=None,
        date_value=None,
        list_value=None,
        boolean_value=None,
    )

    resp = client.patch(
        "/sdocmeta/bulk/update",
        json=[payload.model_dump()],
    )
    assert resp.status_code == 200, resp.json()

    items = [SourceDocumentMetadataRead.model_validate(x) for x in resp.json()]
    assert len(items) == 1
    updated = items[0]

    assert updated.id == meta.id
    assert updated.source_document_id == sdoc.id
    assert updated.project_metadata_id == pm.id
    assert updated.str_value == "Sports"
    assert updated.int_value == meta.int_value
    assert updated.date_value == meta.date_value
    assert updated.boolean_value == meta.boolean_value
    assert updated.list_value == meta.list_value


def test_update_bulk_if_id_not_exsist(
    client: TestClient,
) -> None:
    payload = SourceDocumentMetadataBulkUpdate(
        id=3000,
        str_value="Sports",
        int_value=None,
        date_value=None,
        list_value=None,
        boolean_value=None,
    )

    resp = client.patch(
        "/sdocmeta/bulk/update",
        json=[payload.model_dump()],
    )
    assert resp.status_code == 403, resp.json()


def test_delete_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    project_metadata_factory: ProjectMetadataFactory,
    source_document_metadata_factory: SourceDocumentMetadataFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    pm = project_metadata_factory.create(
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key=f"category{project.id}",
            metatype=MetaType.STRING,
            read_only=False,
            doctype=DocType.text,
            description="read-write",
        )
    )
    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    metadata = source_document_metadata_factory.create(
        create_dto=SourceDocumentMetadataCreate(
            str_value="Politics",
            int_value=None,
            boolean_value=None,
            date_value=None,
            list_value=None,
            project_metadata_id=pm.id,
            source_document_id=sdoc.id,
        )
    )

    response = client.delete(
        f"/sdocmeta/{metadata.id}",
    )
    assert response.status_code == 200

    deleted = SourceDocumentMetadataRead.model_validate(response.json())

    assert deleted.id == metadata.id
    assert deleted.source_document_id == sdoc.id
    assert deleted.project_metadata_id == pm.id
    assert deleted.str_value == "Politics"
    assert deleted.int_value == metadata.int_value
    assert deleted.date_value == metadata.date_value
    assert deleted.boolean_value == metadata.boolean_value
    assert deleted.list_value == metadata.list_value


def test_delete_by_id_if_not_exsist(
    client: TestClient,
) -> None:
    fake_id = 30000

    response = client.delete(
        f"/sdocmeta/{fake_id}",
    )
    assert response.status_code == 403
