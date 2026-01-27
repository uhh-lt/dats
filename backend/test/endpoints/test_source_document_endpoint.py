import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test.factories.code_factory import CodeFactory
from test.factories.project_factory import ProjectFactory
from test.factories.sentence_annotation_factory import SentenceAnnotationFactory
from test.factories.source_document_factory import SourceDocumentFactory

from common.doc_type import DocType
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.code.code_dto import CodeCreate
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import (
    SourceDocumentDataCreate,
    SourceDocumentDataRead,
)
from core.doc.source_document_dto import (
    SourceDocumentCreate,
    SourceDocumentRead,
    SourceDocumentUpdate,
)
from core.user.user_dto import UserRead


def test_get_source_document_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    test_user: UserRead,
    source_document_factory: SourceDocumentFactory,
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

    response = client.get(f"/sdoc/{sdoc.id}")
    assert response.status_code == 200


def test_get_source_document_by_id_if_not_exsist(
    client: TestClient,
) -> None:
    not_exsisting_id = 2000

    response = client.get(f"/sdoc/{not_exsisting_id}")
    assert response.status_code == 403


def test_get_by_id_with_data(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    test_user: UserRead,
    db_session: Session,
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

    data = crud_sdoc_data.create(
        db=db_session,
        create_dto=SourceDocumentDataCreate(
            id=sdoc.id,
            content="Sentence 0. Sentence 1. Sentence 2. Sentence 3.",
            repo_url="http://dummy.com",
            raw_html="<html></html>",
            html="<html></html>",
            token_starts=[0],
            token_ends=[0],
            sentence_starts=[0, 13, 26, 39],
            sentence_ends=[11, 24, 37, 50],
        ),
    )

    resp = client.get(f"/sdoc/data/{sdoc.id}")
    assert resp.status_code == 200
    items = SourceDocumentDataRead.model_validate(resp.json())

    assert items.id == data.id
    assert items.repo_url == data.repo_url
    assert items.html == data.html

    assert items.project_id == project.id


def test_get_by_id_with_data_if_not_exsisit(
    client: TestClient,
):
    resp = client.get("/sdoc/data/9000")
    assert resp.status_code == 403


# TODO muss Fixen ..
def test_delete_source_document_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)
    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="sdoc.txt", name="A", doctype=DocType.text, project_id=project.id
        )
    )
    sdoc_id = sdoc.id

    response = client.delete(f"/sdoc/{sdoc_id}")
    assert response.status_code == 200
    deleted = SourceDocumentRead.model_validate(response.json())
    assert deleted.id == sdoc.id
    assert deleted.project_id == project.id


def test_delete_source_document_by_id_short_if_not_exsist(
    client: TestClient,
) -> None:
    fake_id = 3000

    response = client.delete(f"/sdoc/{fake_id}")
    assert response.status_code == 403


testdata_sdoc_update = [
    pytest.param({"name": "New Title"}, id="update_name"),
    pytest.param({"filename": "updated_file.txt"}, id="update_filename"),
    pytest.param({"name": "Both Changed", "filename": "both.txt"}, id="update_both"),
]


@pytest.mark.parametrize("payload", testdata_sdoc_update)
def test_update_sdoc_parametrized(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    test_user: UserRead,
    payload: dict,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="original.txt",
            name="Original Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    resp = client.patch(
        f"/sdoc/{sdoc.id}",
        json=payload,
    )

    assert resp.status_code == 200, f"Response: {resp.text}"
    updated = SourceDocumentRead.model_validate(resp.json())

    assert updated.id == sdoc.id
    assert updated.project_id == project.id

    assert updated.name == payload.get("name", sdoc.name)
    assert updated.filename == sdoc.filename

    assert updated.doctype == sdoc.doctype


def test_update_sdoc(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc_original = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="original.txt",
            name="Original Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    NEW_NAME = "My Updated Document Title"

    update_payload = SourceDocumentUpdate(
        name=NEW_NAME,
    )

    resp = client.patch(
        f"/sdoc/{sdoc_original.id}",
        json=update_payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 200

    updated = SourceDocumentRead.model_validate(resp.json())

    assert updated.name == NEW_NAME


def test_update_sdoc_if_not_exsist(
    client: TestClient,
) -> None:
    fake_id = 2000

    payload = SourceDocumentUpdate(
        name="New Name",
    )

    resp = client.patch(
        f"/sdoc/{fake_id}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 403


def test_get_same_folder_sdocs(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="sdoc.txt",
            name="A",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    sdoc_2 = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="sdoc_2.txt",
            name="B",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=sdoc.folder_id,
        )
    )

    resp = client.get(f"/sdoc/{sdoc.id}/same_folder")
    assert resp.status_code == 200

    ids = resp.json()
    assert ids == [sdoc.id, sdoc_2.id]


def test_get_same_folder_sdocs_if_not_exsist(
    client: TestClient,
) -> None:
    fake_id = 2000

    response = client.get(
        f"/sdoc/{fake_id}/same_folder",
    )

    assert response.status_code == 403


# TODO ..... def test_get_file_url
def test_get_file_url(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="sdoc.txt",
            name="A",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    response = client.get(f"/sdoc/{sdoc.id}/url")
    assert response.status_code == 200


def test_get_file_url_if_not_exsist(
    client: TestClient,
) -> None:
    fake_id = 2000

    response = client.get(f"/sdoc/{fake_id}/url")
    assert response.status_code == 403


def test_get_annotators_id(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    sentence_annotation_factory: SentenceAnnotationFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="sdoc.txt",
            name="A",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )
    code = code_factory.create(
        create_dto=CodeCreate(
            name="C",
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

    resp = client.get(f"/sdoc/{sdoc.id}/annotators")
    assert resp.status_code == 200
    assert test_user.id in resp.json()


def test_get_annotators_empty_when_no_annotations(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="sdoc.txt",
            name="A",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    resp = client.get(f"/sdoc/{sdoc.id}/annotators")
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_annotators_if_not_exsist(client: TestClient) -> None:
    fake_id = 2000
    resp = client.get(f"/sdoc/{fake_id}/annotators")
    assert resp.status_code == 403
