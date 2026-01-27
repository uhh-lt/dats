import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test.factories.code_factory import CodeFactory
from test.factories.project_factory import ProjectFactory
from test.factories.source_document_factory import SourceDocumentFactory
from test.factories.span_annotation_factory import SpanAnnotationFactory

from common.doc_type import DocType
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import (
    SpanAnnotationCreate,
    SpanAnnotationRead,
    SpanAnnotationUpdate,
)
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_group_dto import SpanGroupCreate
from core.code.code_dto import CodeCreate
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import (
    SourceDocumentDataCreate,
)
from core.doc.source_document_dto import SourceDocumentCreate
from core.user.user_dto import UserRead


def test_add_span_annotation(
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
            name="Doc",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    code = code_factory.create(
        create_dto=CodeCreate(
            name="Span Code",
            color="blue",
            description="for spans",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    payload = SpanAnnotationCreate(
        sdoc_id=sdoc.id,
        code_id=code.id,
        begin=0,
        end=5,
        begin_token=1,
        end_token=50,
        span_text="Span",
    )

    resp = client.put("/span", json=payload.model_dump(exclude_none=True))
    assert resp.status_code == 200, resp.json()

    body = SpanAnnotationRead.model_validate(resp.json())
    assert body.id > 0
    assert body.sdoc_id == sdoc.id
    assert body.code_id == code.id


def test_add_span_annotation_if_not_exsist(
    client: TestClient,
) -> None:
    fake_id = 3000
    payload = SpanAnnotationCreate(
        sdoc_id=fake_id,
        code_id=fake_id,
        begin=0,
        end=5,
        begin_token=1,
        end_token=50,
        span_text="Span",
    )

    resp = client.put("/span", json=payload.model_dump(exclude_none=True))
    assert resp.status_code == 403, resp.json()


def test_add_span_annotations_bulk(
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
        SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=0,
            end=5,
            begin_token=1,
            end_token=50,
            span_text="Span 1",
        ).model_dump(exclude_none=True),
        SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=6,
            end=9,
            begin_token=2,
            end_token=3,
            span_text="Span 2",
        ).model_dump(exclude_none=True),
    ]

    resp = client.put("/span/bulk/create", json=payload)
    assert resp.status_code == 200, resp.json()

    items = [SpanAnnotationRead.model_validate(x) for x in resp.json()]
    assert len(items) == 2
    assert all(i.code_id == code.id and i.sdoc_id == sdoc.id for i in items)


def test_add_span_annotione_bulk_if_not_exsist(
    client: TestClient,
) -> None:
    payload = SpanAnnotationCreate(
        sdoc_id=9000,
        code_id=9000,
        begin=0,
        end=5,
        begin_token=1,
        end_token=50,
        span_text="Span",
    )

    resp = client.put(
        "/span/bulk/create/", json=[payload.model_dump(exclude_none=True)]
    )

    assert resp.status_code == 403


def test_get_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
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

    sa = span_annotation_factory.create(
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=0,
            end=5,
            begin_token=1,
            end_token=50,
            span_text="Span",
        ),
        user_id=test_user.id,
    )

    resp = client.get(f"/span/{sa.id}")
    assert resp.status_code == 200, resp.json()

    span_read = SpanAnnotationRead.model_validate(resp.json())
    assert span_read.id == sa.id
    assert span_read.code_id == code.id
    assert span_read.sdoc_id == sdoc.id
    assert span_read.begin == 0
    assert span_read.end == 5
    assert span_read.begin_token == 1
    assert span_read.end_token == 50


def test_get_by_id_if_id_not_exsist(
    client: TestClient,
) -> None:
    fake_nummer = 3000

    resp = client.get(f"/span/{fake_nummer}")
    assert resp.status_code == 403, resp.json()


def test_get_by_sdoc_and_user(
    db_session: Session,
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
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
            content="Steve Ali is working for the University of Hamburg.",
            repo_url="http://dummy",
            raw_html="<html>Steve Ali is working for the University of Hamburg.</html>",
            html="<html>Steve Ali is working for the University of Hamburg.</html>",
            token_starts=[0, 6, 10, 13, 21, 25, 29, 40, 43, 51],
            token_ends=[5, 9, 12, 20, 24, 28, 39, 42, 50, 52],
            sentence_starts=[0],
            sentence_ends=[52],
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

    span_annotation_factory.create(
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=0,
            end=5,
            begin_token=0,
            end_token=0,
            span_text="Steve",
        ),
        user_id=test_user.id,
    )
    span_annotation_factory.create(
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=6,
            end=9,
            begin_token=1,
            end_token=1,
            span_text="Ali",
        ),
        user_id=test_user.id,
    )

    resp = client.get(f"/span/sdoc/{sdoc.id}/user/{test_user.id}")
    assert resp.status_code == 200

    item = resp.json()[0]
    assert item["sdoc_id"] == sdoc.id
    assert item["code_id"] == code.id
    assert item["begin"] == 0
    assert item["end"] == 5


def test_get_by_sdoc_and_user_both_ids_not_exist(
    client: TestClient,
) -> None:
    sdoc_id = 99999
    user_id = 99999

    resp = client.get(f"/span/sdoc/{sdoc_id}/user/{user_id}")
    assert resp.status_code == 403


test_data_span_update = [
    pytest.param({"code_id": 0}, id="update_code_only"),
    pytest.param({"begin": 10, "end": 15}, id="update_positions"),
    pytest.param({"code_id": 0, "begin": 20}, id="update_both"),
]


@pytest.mark.parametrize("payload", test_data_span_update)
def test_update_span_annotation_parametrized_by_id(
    client: TestClient,
    project_factory,
    source_document_factory,
    code_factory,
    span_annotation_factory,
    test_user,
    payload: dict,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
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
    if "code_id" in payload and payload["code_id"] == 0:
        payload["code_id"] = code2.id

    span_anno = span_annotation_factory.create(
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code1.id,
            begin=0,
            end=5,
            begin_token=0,
            end_token=1,
            span_text="Text",
        ),
        user_id=test_user.id,
    )

    resp = client.patch(f"/span/{span_anno.id}", json=payload)
    assert resp.status_code == 200, f"Error: {resp.text}"

    updated = SpanAnnotationRead.model_validate(resp.json())

    assert updated.id == span_anno.id
    assert updated.sdoc_id == sdoc.id

    assert updated.code_id == payload.get("code_id", span_anno.code_id)
    assert updated.begin == payload.get("begin", span_anno.begin)
    assert updated.end == payload.get("end", span_anno.end)
    assert updated.begin_token == payload.get("begin_token", span_anno.begin_token)
    assert updated.end_token == payload.get("end_token", span_anno.end_token)

    assert updated.text == span_anno.span_text.text


def test_update_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
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
    span_anno = span_annotation_factory.create(
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=6,
            end=9,
            begin_token=1,
            end_token=1,
            span_text="Ali",
        ),
        user_id=test_user.id,
    )

    payload = SpanAnnotationUpdate(code_id=code2.id)

    resp = client.patch(
        f"/span/{span_anno.id}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 200
    updated = SpanAnnotationRead.model_validate(resp.json())
    assert updated.id == span_anno.id
    assert updated.code_id == code2.id
    assert updated.sdoc_id == sdoc.id
    assert updated.begin == 6
    assert updated.end == 9
    assert updated.begin_token == 1
    assert updated.end_token == 1


def test_update_sentence_annotation_by_id_if_not_exsist(client: TestClient) -> None:
    non_existing_span_anno_id = 9999

    payload = SpanAnnotationUpdate(code_id=1)

    resp = client.patch(
        f"/span/{non_existing_span_anno_id}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 403


test_data_bulk = [
    pytest.param({"code_id_link": "new"}, id="update_code"),
    pytest.param({"begin": 10}, id="update_begin"),
    pytest.param({"end": 15}, id="update_end"),
    pytest.param({"begin_token": 1}, id="update_begin_token"),
    pytest.param({"end_token": 6}, id="update_end_token"),
    pytest.param({"span_text": "Original"}, id="update_span_text"),
]


@pytest.mark.parametrize("patch_data", test_data_bulk)
def test_update_span_annotation_parametrize_bulk(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
    test_user: UserRead,
    patch_data: dict,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)
    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt", name="Doc", doctype=DocType.text, project_id=project.id
        )
    )
    sdoc_id = sdoc.id

    code1 = code_factory.create(
        create_dto=CodeCreate(
            name="c1",
            color="r",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    code2 = code_factory.create(
        create_dto=CodeCreate(
            name="c2",
            color="b",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    span_anno = span_annotation_factory.create(
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc_id,
            code_id=code1.id,
            begin=0,
            end=5,
            begin_token=0,
            end_token=1,
            span_text="Original",
        ),
        user_id=test_user.id,
    )

    span_anno_id = span_anno.id
    original_code_id = span_anno.code_id
    original_begin = span_anno.begin
    original_end = span_anno.end
    original_begin_token = span_anno.begin_token
    original_end_token = span_anno.end_token
    original_text = span_anno.span_text.text

    payload = {
        "code_id": code2.id if "code_id_link" in patch_data else original_code_id,
        "begin": patch_data.get("begin", original_begin),
        "end": patch_data.get("end", original_end),
        "begin_token": patch_data.get("begin_token", original_begin_token),
        "end_token": patch_data.get("end_token", original_end_token),
        "span_text": patch_data.get("span_text", original_text),
    }

    resp = client.patch(f"/span/{span_anno_id}", json=payload)

    assert resp.status_code == 200, f"Error: {resp.text}"
    updated = SpanAnnotationRead.model_validate(resp.json())

    assert updated.id == span_anno_id
    assert updated.sdoc_id == sdoc_id

    assert updated.code_id == payload.get("code_id")
    assert updated.begin == payload.get("begin")
    assert updated.end == payload.get("end")
    assert updated.begin_token == payload.get("begin_token")
    assert updated.end_token == payload.get("end_token")
    assert updated.text == payload.get("span_text")


def test_update_span_annotations_bulk(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
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
    code1 = code_factory.create(
        create_dto=CodeCreate(
            name="c1",
            color="r",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    code2 = code_factory.create(
        create_dto=CodeCreate(
            name="c2",
            color="b",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    a1 = span_annotation_factory.create(
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code1.id,
            begin=0,
            end=3,
            begin_token=0,
            end_token=1,
            span_text="foo",
        ),
    )
    a2 = span_annotation_factory.create(
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code1.id,
            begin=5,
            end=7,
            begin_token=2,
            end_token=3,
            span_text="bar",
        ),
    )

    payload = [
        {"span_annotation_id": a1.id, "code_id": code2.id},
        {"span_annotation_id": a2.id, "code_id": code2.id},
    ]
    resp = client.patch("/span/bulk/update", json=payload)
    assert resp.status_code == 200, resp.json()
    body = resp.json()
    assert {item["id"]: item["code_id"] for item in body} == {
        a1.id: code2.id,
        a2.id: code2.id,
    }


def test_update_span_annotations_bulk_not_exists(
    client: TestClient,
    project_factory: ProjectFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)
    code = code_factory.create(
        create_dto=CodeCreate(
            name="c1",
            color="r",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    payload = [
        {"span_annotation_id": 9991, "code_id": code.id},
        {"span_annotation_id": 9992, "code_id": code.id},
    ]
    resp = client.patch("/span/bulk/update", json=payload)
    assert resp.status_code == 403, resp.json()


def test_delete_span_annotation_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
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
    span = span_annotation_factory.create(
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=0,
            end=5,
            begin_token=0,
            end_token=1,
            span_text="Span",
        ),
    )

    resp = client.delete(f"/span/{span.id}")
    assert resp.status_code == 200

    deleted = resp.json()
    assert deleted["id"] == span.id
    assert deleted["sdoc_id"] == sdoc.id
    assert deleted["code_id"] == code.id
    assert deleted["begin"] == 0
    assert deleted["end"] == 5


def test_delete_span_annotation_by_id_if_not_exsist(
    client: TestClient,
) -> None:
    resp = client.delete("/span/999999")
    assert resp.status_code == 403


def test_delete_span_annotations_bulk(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
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
    a1 = span_annotation_factory.create(
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=0,
            end=3,
            begin_token=0,
            end_token=1,
            span_text="foo",
        ),
    )
    a2 = span_annotation_factory.create(
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=5,
            end=7,
            begin_token=2,
            end_token=3,
            span_text="bar",
        ),
    )

    resp = client.request("DELETE", "/span/bulk/delete", json=[a1.id, a2.id])
    assert resp.status_code == 200, resp.json()

    body = resp.json()
    returned_ids = {item["id"] for item in body}
    assert returned_ids == {a1.id, a2.id}


def test_delete_span_annotations_bulk_not_exists(client: TestClient) -> None:
    resp = client.request("DELETE", "/span/bulk/delete", json=[999999])
    assert resp.status_code == 403, resp.json()


def test_get_by_user_code(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
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

    a1 = span_annotation_factory.create(
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=0,
            end=5,
            begin_token=0,
            end_token=1,
            span_text="Span",
        ),
        user_id=test_user.id,
    )
    a2 = span_annotation_factory.create(
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=6,
            end=9,
            begin_token=2,
            end_token=3,
            span_text="Span 2",
        ),
        user_id=test_user.id,
    )

    resp = client.get(f"/span/code/{code.id}/user")

    assert resp.status_code == 200
    items = resp.json()
    assert {i["id"] for i in items} == {a1.id, a2.id}
    assert all(i["code_id"] == code.id for i in items)


def test_get_by_user_code_if_not_exsist(client: TestClient) -> None:
    non_existing_id = 1000
    resp = client.get(f"/span/code/{non_existing_id}/user")
    assert resp.status_code == 403


def test_count_span_annotations(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
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

    span_annotation_factory.create(
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=0,
            end=5,
            begin_token=0,
            end_token=1,
            span_text="foo",
        ),
        user_id=test_user.id,
    )
    span_annotation_factory.create(
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=6,
            end=9,
            begin_token=2,
            end_token=3,
            span_text="bar",
        ),
        user_id=test_user.id,
    )

    payload = {"sdoc_ids": [sdoc.id], "class_ids": [code.id]}
    resp = client.post(f"/span/count_annotations/{test_user.id}", json=payload)

    assert resp.status_code == 200, resp.json()
    data = resp.json()
    assert data.get(str(code.id)) == 2


def test_count_annotation_if_not_exsist(client: TestClient) -> None:
    not_exsisitng_id = 2000
    payload = {"sdoc_ids": [not_exsisitng_id], "class_ids": [not_exsisitng_id]}

    resp = client.post(f"/span/count_annotations/{not_exsisitng_id}", json=payload)

    assert resp.status_code == 403


def test_add_to_group_ok(
    db_session: Session,
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
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
            name="C",
            color="x",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    span = span_annotation_factory.create(
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=0,
            end=3,
            begin_token=0,
            end_token=1,
            span_text="foo",
        ),
    )

    group = crud_span_group.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=SpanGroupCreate(name="g1", sdoc_id=sdoc.id),
    )

    resp = client.patch(f"/span/{span.id}/group/{group.id}")

    assert resp.status_code == 200, resp.json()
    body = resp.json()
    assert body["id"] == span.id
    assert body["sdoc_id"] == sdoc.id
    assert body["code_id"] == code.id


def test_add_to_group_not_found(client: TestClient):
    resp = client.patch("/span/999999/group/888888")
    assert resp.status_code == 403, resp.json()


def test_remove_from_group_ok(
    db_session: Session,
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
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
            name="C",
            color="x",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    span = span_annotation_factory.create(
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=0,
            end=3,
            begin_token=0,
            end_token=1,
            span_text="foo",
        ),
    )

    group = crud_span_group.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=SpanGroupCreate(name="g1", sdoc_id=sdoc.id),
    )

    add_resp = client.patch(f"/span/{span.id}/group/{group.id}")
    assert add_resp.status_code == 200, add_resp.json()


def test_remove_from_group_not_exists(client: TestClient):
    resp = client.delete("/span/999999/group/888888")
    assert resp.status_code == 403


def test_remove_from_all_groups_ok(
    db_session: Session,
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
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
            name="C",
            color="x",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    span = span_annotation_factory.create(
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=0,
            end=3,
            begin_token=0,
            end_token=1,
            span_text="foo",
        ),
    )

    resp = client.delete(f"/span/{span.id}/groups")

    assert resp.status_code == 200, resp.json()
    deleted = resp.json()
    assert deleted["id"] == span.id
    assert deleted["sdoc_id"] == sdoc.id
    assert deleted["code_id"] == code.id
    assert deleted["begin"] == 0
    assert deleted["end"] == 3

    span_after = crud_span_anno.read(db=db_session, id=span.id)
    assert len(span_after.span_groups) == 0


def test_remove_from_all_groups_not_found(client: TestClient):
    resp = client.delete("/span/999999/groups")
    assert resp.status_code == 403, resp.json()


def test_get_groups_ok(
    db_session: Session,
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    span_annotation_factory: SpanAnnotationFactory,
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
            name="C",
            color="x",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    span = span_annotation_factory.create(
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=0,
            end=3,
            begin_token=0,
            end_token=1,
            span_text="foo",
        ),
    )

    g1 = crud_span_group.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=SpanGroupCreate(name="g1", sdoc_id=sdoc.id),
    )
    g2 = crud_span_group.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=SpanGroupCreate(name="g2", sdoc_id=sdoc.id),
    )

    resp = client.get(f"/span/{span.id}/groups")

    assert resp.status_code == 200, resp.json()
    groups = resp.json()
    returned_ids = {g["id"] for g in groups}
    assert returned_ids == {g1.id, g2.id}


def test_get_groups_not_found(client: TestClient):
    resp = client.get("/span/999999/groups")
    assert resp.status_code == 403, resp.json()
