from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test.factories.project_factory import ProjectFactory
from test.factories.source_document_factory import SourceDocumentFactory
from test.factories.tag_factory import TagFactory

from common.doc_type import DocType
from core.doc.source_document_dto import SourceDocumentCreate
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import (
    SourceDocumentTagMultiLink,
    TagCreate,
    TagRead,
    TagUpdate,
)
from core.user.user_dto import UserRead


def test_create_new_doc_tag(
    client: TestClient,
    project_factory: ProjectFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    payload = TagCreate(
        name="Tag",
        color="Red",
        description="Tag Content",
        parent_id=None,
        project_id=project.id,
    )

    resp = client.put("/tag", json=payload.model_dump(exclude_none=True))

    assert resp.status_code == 200

    tag_assert = TagRead.model_validate(resp.json())

    assert tag_assert.name == payload.name
    assert tag_assert.color == payload.color
    assert tag_assert.description == payload.description
    assert tag_assert.parent_id == payload.parent_id


def test_create_new_doc_tag_if_not_exsist(
    client: TestClient,
) -> None:
    not_exsist_id = 9999

    payload = TagCreate(
        name="Tag",
        color="Red",
        description="Tag Content",
        parent_id=None,
        project_id=not_exsist_id,
    )

    resp = client.put("/tag", json=payload.model_dump(exclude_none=True))
    assert resp.status_code == 403


def test_link_multiple_tags(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    tag_factory: TagFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Doc",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    t1 = tag_factory.create(
        create_dto=TagCreate(
            name="T1",
            color="red",
            description=None,
            parent_id=None,
            project_id=project.id,
        )
    )
    t2 = tag_factory.create(
        create_dto=TagCreate(
            name="T2",
            color="blue",
            description=None,
            parent_id=None,
            project_id=project.id,
        )
    )

    payload = SourceDocumentTagMultiLink(
        source_document_ids=[sdoc.id],
        tag_ids=[t1.id, t2.id],
    )

    resp = client.patch("/tag/bulk/link", json=payload.model_dump(exclude_none=True))
    assert resp.status_code == 200, resp.json()

    assert resp.json() == 2


def test_link_multiple_tags_not_exist(client: TestClient) -> None:
    payload = {
        "source_document_ids": [998, 999],
        "tag_ids": [889, 888],
    }

    resp = client.patch("/tag/bulk/link", json=payload)
    assert resp.status_code == 403, resp.json()


def test_unlink_multiple_tags(
    db_session: Session,
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    tag_factory: TagFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)
    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Doc",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    tag1 = tag_factory.create(
        create_dto=TagCreate(
            name="T1",
            color="red",
            description="data",
            parent_id=None,
            project_id=project.id,
        )
    )
    tag2 = tag_factory.create(
        create_dto=TagCreate(
            name="T2",
            color="blue",
            description="data",
            parent_id=None,
            project_id=project.id,
        )
    )
    crud_tag.link_multiple_tags(
        db=db_session, sdoc_ids=[sdoc.id], tag_ids=[tag1.id, tag2.id]
    )

    payload = {"source_document_ids": [sdoc.id], "tag_ids": [tag1.id, tag2.id]}
    resp = client.request("DELETE", "/tag/bulk/unlink", json=payload)

    assert resp.status_code == 200, resp.json()
    assert resp.json() == 2


def test_unlink_multiple_tags_not_exist(client: TestClient) -> None:
    payload = {"source_document_ids": [999], "tag_ids": [889, 888]}
    resp = client.request("DELETE", "/tag/bulk/unlink", json=payload)
    assert resp.status_code == 403, resp.json()


def test_set_tags_batch(
    db_session: Session,
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    tag_factory: TagFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)
    sdoc1 = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="tag1.txt",
            name="Tag 1",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    sdoc2 = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="tag2.txt",
            name="Tag 2",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    t1 = tag_factory.create(
        create_dto=TagCreate(
            name="T1",
            color="red",
            description="data1",
            parent_id=None,
            project_id=project.id,
        )
    )
    t2 = tag_factory.create(
        create_dto=TagCreate(
            name="T2",
            color="green",
            description="data2",
            parent_id=None,
            project_id=project.id,
        )
    )
    t3 = tag_factory.create(
        create_dto=TagCreate(
            name="T3",
            color="blue",
            description="data3",
            parent_id=None,
            project_id=project.id,
        )
    )

    crud_tag.link_multiple_tags(db=db_session, sdoc_ids=[sdoc1.id], tag_ids=[t1.id])
    crud_tag.link_multiple_tags(
        db=db_session, sdoc_ids=[sdoc2.id], tag_ids=[t1.id, t2.id]
    )

    payload = [
        {"source_document_id": sdoc1.id, "tag_ids": [t2.id, t3.id]},
        {"source_document_id": sdoc2.id, "tag_ids": [t2.id]},
    ]

    resp = client.patch("/tag/bulk/set", json=payload)

    assert resp.status_code == 200, resp.json()
    assert resp.json() == 4


def test_set_tags_batch_not_exist(client: TestClient) -> None:
    payload = [{"source_document_id": 999, "tag_ids": [882, 881]}]
    resp = client.patch("/tag/bulk/set", json=payload)
    assert resp.status_code == 403, resp.json()


def test_update_tags_batch(
    db_session: Session,
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    tag_factory: TagFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="tag.txt",
            name="Tag 2",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    t1 = tag_factory.create(
        create_dto=TagCreate(
            name="T1",
            color="red",
            description="data1",
            parent_id=None,
            project_id=project.id,
        )
    )
    t2 = tag_factory.create(
        create_dto=TagCreate(
            name="T2",
            color="green",
            description="data2",
            parent_id=None,
            project_id=project.id,
        )
    )

    crud_tag.link_multiple_tags(db=db_session, sdoc_ids=[sdoc.id], tag_ids=[t1.id])

    payload = {
        "sdoc_ids": [sdoc.id],
        "unlink_tag_ids": [t1.id],
        "link_tag_ids": [t2.id],
    }

    resp = client.patch("/tag/bulk/update", json=payload)

    assert resp.status_code == 200
    assert resp.json() == 2


def test_update_tags_batch_not_exists(
    client: TestClient,
) -> None:
    payload = {
        "sdoc_ids": [999999],
        "unlink_tag_ids": [888888],
        "link_tag_ids": [777777],
    }

    resp = client.patch("/tag/bulk/update", json=payload)
    assert resp.status_code == 403, resp.json()


def test_get_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    tag_factory: TagFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    tag = tag_factory.create(
        create_dto=TagCreate(
            name="T1",
            color="red",
            description="data1",
            parent_id=None,
            project_id=project.id,
        )
    )
    resp = client.get(f"/tag/{tag.id}")
    assert resp.status_code == 200


def test_get_by_id_if_not_exsis(
    client: TestClient,
) -> None:
    not_exsist_id = 1441

    resp = client.get(f"/tag/{not_exsist_id}")
    assert resp.status_code == 403


def test_get_tags_by_project(
    client: TestClient,
    project_factory: ProjectFactory,
    tag_factory: TagFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    t1 = tag_factory.create(
        create_dto=TagCreate(
            name="T1",
            color="red",
            description="d",
            parent_id=None,
            project_id=project.id,
        )
    )
    t2 = tag_factory.create(
        create_dto=TagCreate(
            name="T2",
            color="blue",
            description="d",
            parent_id=None,
            project_id=project.id,
        )
    )

    resp = client.get(f"/tag/project/{project.id}")
    assert resp.status_code == 200, resp.json()
    items = [TagRead.model_validate(x) for x in resp.json()]
    assert {t.id for t in items} == {t1.id, t2.id}


def test_get_tags_by_project_not_exsist_id(
    client: TestClient,
) -> None:
    not_exsist_id = 1441

    resp = client.get(f"/tag/project/{not_exsist_id}")
    assert resp.status_code == 403, resp.json()


def test_get_by_sdoc(
    client: TestClient,
    db_session: Session,
    project_factory: ProjectFactory,
    tag_factory: TagFactory,
    test_user: UserRead,
    source_document_factory: SourceDocumentFactory,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)
    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="tag.txt",
            name="Tag 2",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    t1 = tag_factory.create(
        create_dto=TagCreate(
            name="T1",
            color="red",
            description="data1",
            parent_id=None,
            project_id=project.id,
        )
    )
    t2 = tag_factory.create(
        create_dto=TagCreate(
            name="T2",
            color="green",
            description="data2",
            parent_id=None,
            project_id=project.id,
        )
    )
    crud_tag.link_multiple_tags(db_session, sdoc_ids=[sdoc.id], tag_ids=[t1.id, t2.id])

    resp = client.get(f"/tag/sdoc/{sdoc.id}")
    assert resp.status_code == 200, resp.json()

    tag_ids = set(resp.json())
    assert tag_ids == {t1.id, t2.id}


def test_get_by_sdoc_if_not_exsist(
    client: TestClient,
) -> None:
    not_exsist_id = 1441

    resp = client.get(f"/tag/sdoc/{not_exsist_id}")
    assert resp.status_code == 403, resp.json()


def test_update_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    tag_factory: TagFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    tag = tag_factory.create(
        create_dto=TagCreate(
            name="old name",
            color="green",
            description="data1",
            parent_id=None,
            project_id=project.id,
        )
    )
    payload = TagUpdate(
        name="new name",
        color="blue",
        description="data2",
        parent_id=None,
    )
    resp = client.patch(f"/tag/{tag.id}", json=payload.model_dump(exclude_none=True))
    assert resp.status_code == 200
    updated = TagRead.model_validate(resp.json())
    assert updated.color == payload.color
    assert updated.name == payload.name
    assert updated.description == payload.description
    assert updated.parent_id is payload.parent_id


def test_update_tag_not_exists(client: TestClient) -> None:
    payload = TagUpdate(
        name="None", description="Content", parent_id=None, color="white"
    )

    resp = client.patch("/tag/999999", json=payload.model_dump(exclude_none=True))

    assert resp.status_code == 404
    assert "There exists no Tag" in resp.text


def test_delete_tag_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    tag_factory: TagFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)
    tag = tag_factory.create(
        create_dto=TagCreate(
            name="T1",
            color="red",
            description="desc",
            parent_id=None,
            project_id=project.id,
        )
    )

    resp = client.delete(f"/tag/{tag.id}")
    assert resp.status_code == 200

    deleted = TagRead.model_validate(resp.json())
    assert deleted.id == tag.id
    assert deleted.project_id == project.id
    assert deleted.name == "T1"
    assert deleted.color == "red"
    assert deleted.description == "desc"
    assert deleted.parent_id is None


def test_delete_tag_by_id_if_not_exsist(
    client: TestClient,
) -> None:
    not_exsist_id = 3000

    resp = client.delete(f"/tag/{not_exsist_id}")
    assert resp.status_code == 403


def test_get_sdoc_ids_by_tag_id(
    client: TestClient,
    project_factory: ProjectFactory,
    tag_factory: TagFactory,
    test_user: UserRead,
    db_session: Session,
    source_document_factory: SourceDocumentFactory,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)
    sd1 = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc1.txt",
            name="Doc",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    sd2 = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc2.txt",
            name="Doc",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    tag = tag_factory.create(
        create_dto=TagCreate(
            name="T1",
            color="red",
            description="desc",
            parent_id=None,
            project_id=project.id,
        )
    )

    crud_tag.link_multiple_tags(
        db=db_session, sdoc_ids=[sd1.id, sd2.id], tag_ids=[tag.id]
    )

    resp = client.get(f"/tag/{tag.id}/sdocs")
    assert resp.status_code == 200
    ids = set(resp.json())
    assert ids == {sd1.id, sd2.id}


def test_get_sdoc_ids_by_tag_id_if_not_exsist(
    client: TestClient,
) -> None:
    not_exsist_id = 2000

    resp = client.get(f"/tag/{not_exsist_id}/sdocs")
    assert resp.status_code == 403


def test_get_sdoc_counts(
    db_session: Session,
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    tag_factory: TagFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc1 = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="a.txt",
            name="A",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    sdoc2 = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="b.txt",
            name="B",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    t1 = tag_factory.create(
        create_dto=TagCreate(
            name="T1",
            color="red",
            description="d",
            parent_id=None,
            project_id=project.id,
        )
    )
    t2 = tag_factory.create(
        create_dto=TagCreate(
            name="T2",
            color="blue",
            description="d",
            parent_id=None,
            project_id=project.id,
        )
    )

    crud_tag.link_multiple_tags(
        db=db_session, sdoc_ids=[sdoc1.id], tag_ids=[t1.id, t2.id]
    )
    crud_tag.link_multiple_tags(db=db_session, sdoc_ids=[sdoc2.id], tag_ids=[t2.id])

    payload = [sdoc1.id, sdoc2.id]
    resp = client.post("/tag/sdoc_counts", json=payload)

    assert resp.status_code == 200, resp.json()
    data = resp.json()
    assert data.get(str(t1.id)) == 1
    assert data.get(str(t2.id)) == 2


def test_get_sdoc_counts_if_not_exsist(client: TestClient) -> None:
    payload = [9000, 3000]

    resp = client.post("/tag/sdoc_counts", json=payload)

    assert resp.status_code == 403, resp.text


def test_count_tags(
    db_session: Session,
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    tag_factory: TagFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc_1 = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="first_file",
            name="file",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    sdoc_2 = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="secound_file",
            name="file2",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    tag = tag_factory.create(
        create_dto=TagCreate(
            name="file",
            color="red",
            description="Christmes",
            parent_id=None,
            project_id=project.id,
        )
    )

    crud_tag.link_multiple_tags(
        db=db_session, sdoc_ids=[sdoc_1.id, sdoc_2.id], tag_ids=[tag.id]
    )

    payload = {"sdoc_ids": [sdoc_1.id, sdoc_2.id], "class_ids": [tag.id]}

    resp = client.post(f"/tag/count_tags/{test_user.id}", json=payload)

    assert resp.status_code == 200, resp.json()

    data = resp.json()

    assert data.get(str(tag.id)) == 2


def test_count_tags_not_exists(client: TestClient) -> None:
    not_exsist_id = 2000
    payload = {"sdoc_ids": [999999], "class_ids": [999999]}
    resp = client.post(f"/tag/count_tags/{not_exsist_id}", json=payload)
    assert resp.status_code == 403, resp.text
