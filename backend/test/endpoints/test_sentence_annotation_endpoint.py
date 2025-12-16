from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test.factories.code_factory import CodeFactory
from test.factories.project_factory import ProjectFactory
from test.factories.sentence_annotation_factory import SentenceAnnotationFactory
from test.factories.source_document_factory import SourceDocumentFactory

from common.doc_type import DocType
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
    SentenceAnnotationUpdate,
)
from core.code.code_dto import CodeCreate
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import (
    SourceDocumentDataCreate,
)
from core.doc.source_document_dto import SourceDocumentCreate
from core.user.user_dto import UserRead


def test_add_sentence_annotation(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    code = code_factory.create(
        create_dto=CodeCreate(
            name="Memo Target Code",
            color="Blue",
            description="Code for sentence test",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    payload = SentenceAnnotationCreate(
        sentence_id_start=1,
        sentence_id_end=2,
        code_id=code.id,
        sdoc_id=sdoc.id,
    )
    response = client.put("sentence", json=payload.model_dump())

    assert response.status_code == 200
    sentence = SentenceAnnotationRead.model_validate(response.json())
    assert sentence.sentence_id_start == payload.sentence_id_start
    assert sentence.sentence_id_end == payload.sentence_id_end
    assert sentence.code_id == code.id
    assert sentence.sdoc_id == sdoc.id


def test_add_sentence_annotation_attached_not_existing(
    client: TestClient,
):
    payload = SentenceAnnotationCreate(
        sentence_id_start=0,
        sentence_id_end=0,
        code_id=9999,
        sdoc_id=9999,
    )

    resp = client.put("/sentence", json=payload.model_dump())

    assert resp.status_code == 403


def test_add_sentence_annotations_bulk(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    code = code_factory.create(
        create_dto=CodeCreate(
            name="A Code",
            color="Red",
            description="desc",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    payload = [
        SentenceAnnotationCreate(
            sentence_id_start=1, sentence_id_end=2, code_id=code.id, sdoc_id=sdoc.id
        ).model_dump(),
        SentenceAnnotationCreate(
            sentence_id_start=3, sentence_id_end=4, code_id=code.id, sdoc_id=sdoc.id
        ).model_dump(),
    ]

    response = client.put("/sentence/bulk/create", json=payload)

    assert response.status_code == 200
    items = [SentenceAnnotationRead.model_validate(x) for x in response.json()]
    assert len(items) == 2
    for sent in items:
        assert sent.code_id == code.id
        assert sent.sdoc_id == sdoc.id


def test_add_sentence_annotione_bulk_if_not_exsist(
    client: TestClient,
) -> None:
    payload = SentenceAnnotationCreate(
        sentence_id_start=0,
        sentence_id_end=0,
        code_id=9999,
        sdoc_id=9999,
    )

    resp = client.put("/sentence/bulk/create/", json=[payload.model_dump()])

    assert resp.status_code == 403


def test_get_sentence_annotation_endpoint_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    sentence_annotation_factory: SentenceAnnotationFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    code = code_factory.create(
        create_dto=CodeCreate(
            name="Memo Target Code",
            color="Blue",
            description="Code for sentence test",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    sa = sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=1, sentence_id_end=2, code_id=code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )

    resp = client.get(f"/sentence/{sa.id}")

    assert resp.status_code == 200
    sentence_read = SentenceAnnotationRead.model_validate(resp.json())
    assert sentence_read.id == sa.id
    assert sentence_read.code_id == code.id
    assert sentence_read.sdoc_id == sdoc.id
    assert sentence_read.sentence_id_start == 1
    assert sentence_read.sentence_id_end == 2


def test_get_sentence_annotation_by_id_if_not_exsist(client: TestClient) -> None:
    payload = SentenceAnnotationCreate(
        sentence_id_start=1,
        sentence_id_end=2,
        code_id=9999,
        sdoc_id=9999,
    )
    response = client.get(f"/sentence/ {payload.code_id}")
    assert response.status_code == 403


def test_get_by_sdoc_and_user(
    client: TestClient,
    db_session: Session,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    sentence_annotation_factory: SentenceAnnotationFactory,
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
    crud_sdoc_data.create(
        db=db_session,
        create_dto=SourceDocumentDataCreate(
            id=sdoc.id,
            content="Sentence 0. Sentence 1. Sentence 2. Sentence 3.",
            repo_url="http://dummy",
            raw_html="<html/>",
            html="<html/>",
            token_starts=[0],
            token_ends=[0],
            sentence_starts=[0, 13, 26, 39],
            sentence_ends=[11, 24, 37, 50],
        ),
    )
    code = code_factory.create(
        create_dto=CodeCreate(
            name="A",
            color="X",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=0, sentence_id_end=0, code_id=code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )
    sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=2, sentence_id_end=3, code_id=code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )

    resp = client.get(f"/sentence/sdoc/{sdoc.id}/user/{test_user.id}")
    assert resp.status_code == 200

    data = resp.json()["sentence_annotations"]
    for idx in ("0", "2", "3"):
        assert data.get(idx)

    first = data["0"][0]
    assert first["sdoc_id"] == sdoc.id
    assert first["code_id"] == code.id
    assert first["sentence_id_start"] == 0
    assert first["sentence_id_end"] == 0


def test_get_by_sdoc_and_user_both_ids_not_exist(
    client: TestClient,
) -> None:
    sdoc_id = 99999
    user_id = 99999

    resp = client.get(f"/sentence/sdoc/{sdoc_id}/user/{user_id}")
    assert resp.status_code == 403


def test_update_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    sentence_annotation_factory: SentenceAnnotationFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)
    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    code1 = code_factory.create(
        create_dto=CodeCreate(
            name="code-1",
            color="red",
            description="desc",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    code2 = code_factory.create(
        create_dto=CodeCreate(
            name="code-2",
            color="blue",
            description="desc",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    sent_anno = sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=1,
            sentence_id_end=2,
            code_id=code1.id,
            sdoc_id=sdoc.id,
        ),
        user_id=test_user.id,
    )

    payload = SentenceAnnotationUpdate(code_id=code2.id)

    resp = client.patch(
        f"/sentence/{sent_anno.id}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 200
    updated = SentenceAnnotationRead.model_validate(resp.json())
    assert updated.id == sent_anno.id
    assert updated.code_id == code2.id
    assert updated.sdoc_id == sdoc.id
    assert updated.sentence_id_start == 1
    assert updated.sentence_id_end == 2


def test_update_sentence_annotation_by_id_if_not_exsist(client: TestClient) -> None:
    non_existing_sentence_anno_id = 9999

    payload = SentenceAnnotationUpdate(code_id=1)

    resp = client.patch(
        f"/sentence/{non_existing_sentence_anno_id}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 403


def test_update_sent_anno_annotations_bulk(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    sentence_annotation_factory: SentenceAnnotationFactory,
    test_user: UserRead,
):
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
    old_code = code_factory.create(
        create_dto=CodeCreate(
            name="old",
            color="c",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    new_code = code_factory.create(
        create_dto=CodeCreate(
            name="new",
            color="c",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    sa1 = sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=0, sentence_id_end=0, code_id=old_code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )
    sa2 = sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=1, sentence_id_end=1, code_id=old_code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )

    payload = [
        {"sent_annotation_id": sa1.id, "code_id": new_code.id},
        {"sent_annotation_id": sa2.id, "code_id": new_code.id},
    ]
    resp = client.patch("/sentence/bulk/update", json=payload)

    assert resp.status_code == 200
    items = [SentenceAnnotationRead.model_validate(x) for x in resp.json()]
    assert len(items) == 2
    assert {x.id for x in items} == {sa1.id, sa2.id}
    assert all(x.code_id == new_code.id for x in items)


def test_update_sent_anno_annotations_bulk_not_exists(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    sentence_annotation_factory: SentenceAnnotationFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)

    non_exsisting_id = 6666
    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Doc",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    code = code_factory.create(
        create_dto=CodeCreate(
            name="old",
            color="c",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    sentence = sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=0, sentence_id_end=0, code_id=code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )

    payload = [
        {"sent_annotation_id": sentence.id, "code_id": code.id},
        {"sent_annotation_id": non_exsisting_id, "code_id": code.id},
    ]
    resp = client.patch("/sentence/bulk/update", json=payload)
    assert resp.status_code == 403


def test_delete_sentence_annotation_endpoint_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    sentence_annotation_factory: SentenceAnnotationFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    code = code_factory.create(
        create_dto=CodeCreate(
            name="Memo Target Code",
            color="Blue",
            description="Code for sentence test",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    sa = sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=1, sentence_id_end=2, code_id=code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )

    resp = client.delete(f"/sentence/{sa.id}")

    assert resp.status_code == 200
    sentence_read = SentenceAnnotationRead.model_validate(resp.json())
    assert sentence_read.id == sa.id
    assert sentence_read.code_id == code.id
    assert sentence_read.sdoc_id == sdoc.id
    assert sentence_read.sentence_id_start == 1
    assert sentence_read.sentence_id_end == 2


def test_delete_sentence_annotation_by_id_not_exists(client: TestClient):
    resp = client.delete("/sentence/999999")
    assert resp.status_code == 403


def delete_bulk_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    sentence_annotation_factory: SentenceAnnotationFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    code = code_factory.create(
        create_dto=CodeCreate(
            name="delete",
            color="red",
            description="x",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    sa1 = sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=0, sentence_id_end=0, code_id=code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )
    sa2 = sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=2, sentence_id_end=3, code_id=code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )

    resp = client.request("DELETE", "/sentence/bulk/delete", json=[sa1.id, sa2.id])
    assert resp.status_code == 200


def test_delete_bulk_by_id_if_not_exsist(
    client: TestClient,
    test_user: UserRead,
    code_factory: CodeFactory,
    project_factory: ProjectFactory,
    sentence_annotation_factory: SentenceAnnotationFactory,
    source_document_factory: SourceDocumentFactory,
) -> None:
    not_exsisting_id = 6666
    project = project_factory.create(creating_user_id=test_user.id)
    code = code_factory.create(
        create_dto=CodeCreate(
            name="delete",
            color="red",
            description="x",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
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
    sa1 = sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=0, sentence_id_end=0, code_id=code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )

    resp = client.request(
        "DELETE",
        "/sentence/bulk/delete",
        json=[sa1.id, not_exsisting_id],
    )
    assert resp.status_code == 403


# or short way :


def test_delete_bulk_by_id_if_not_exists_short(client: TestClient) -> None:
    resp = client.request("DELETE", "/sentence/bulk/delete", json=[999999, 888888])

    assert resp.status_code == 403


def test_get_by_user_code(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    sentence_annotation_factory: SentenceAnnotationFactory,
    test_user: UserRead,
):
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
    code = code_factory.create(
        create_dto=CodeCreate(
            name="C1",
            color="red",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=0, sentence_id_end=0, code_id=code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )
    sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=1, sentence_id_end=2, code_id=code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )

    resp = client.get(f"/sentence/code/{code.id}/user")

    assert resp.status_code == 200
    items = [SentenceAnnotationRead.model_validate(x) for x in resp.json()]
    assert {(i.sentence_id_start, i.sentence_id_end) for i in items} == {(0, 0), (1, 2)}
    assert all(i.user_id == test_user.id for i in items)


def test_get_by_user_code_if_not_exsist(
    client: TestClient,
) -> None:
    not_exsisting_id = 1000

    response = client.get(f"/code/{not_exsisting_id}/user")

    assert response.status_code == 404


def test_count_annotations(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    sentence_annotation_factory: SentenceAnnotationFactory,
    test_user: UserRead,
):
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
    code = code_factory.create(
        create_dto=CodeCreate(
            name="C1",
            color="red",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=0, sentence_id_end=0, code_id=code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )
    sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=1, sentence_id_end=1, code_id=code.id, sdoc_id=sdoc.id
        ),
        user_id=test_user.id,
    )

    payload = {"sdoc_ids": [sdoc.id], "class_ids": [code.id]}

    resp = client.post(f"/sentence/count_annotations/{test_user.id}", json=payload)

    assert resp.status_code == 200
    data = resp.json()
    assert data.get(str(code.id)) == 2


def test_count_annotation_if_not_exsist(client: TestClient) -> None:
    not_exsisitng_id = 2000
    payload = {"sdoc_ids": [not_exsisitng_id], "class_ids": [not_exsisitng_id]}

    resp = client.post(f"/sentence/count_annotations/{not_exsisitng_id}", json=payload)

    assert resp.status_code == 403
