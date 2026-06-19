from typing import TypedDict

import pytest
from fastapi.testclient import TestClient

from core.doc.source_document_data_dto import (
    SourceDocumentDataRead,
)
from core.doc.source_document_dto import (
    SourceDocumentRead,
    SourceDocumentUpdate,
)
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM


class ProjectWithSourceDocumentForTest(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM


def test_get_source_document_by_id(client: TestClient, project_with_source_document):
    sdoc = project_with_source_document["source_document"]

    response = client.get(f"/sdoc/{sdoc.id}")

    assert response.status_code == 200
    data = SourceDocumentRead.model_validate(response.json())
    assert data.id == sdoc.id
    assert data.project_id == sdoc.project_id
    assert data.name == sdoc.name
    assert data.filename == sdoc.filename
    assert data.doctype == sdoc.doctype


def test_get_source_document_by_id_if_not_exists(
    client: TestClient,
):
    not_existsing_id = 2000
    response = client.get(f"/sdoc/{not_existsing_id}")

    assert response.status_code == 403


def test_get_by_id_with_data(
    client: TestClient,
    project_with_source_document_data,
):
    sdoc = project_with_source_document_data["source_document"]
    data = project_with_source_document_data["source_document_data"]

    resp = client.get(f"/sdoc/data/{sdoc.id}")
    assert resp.status_code == 200
    data_read = SourceDocumentDataRead.model_validate(resp.json())

    assert data_read.id == data.id
    assert data_read.repo_url == data.repo_url
    assert data_read.html == data.html


def test_get_by_id_with_data_if_not_exsisit(
    client: TestClient,
):
    non_existing_sdoc_id = 2000
    resp = client.get(f"/sdoc/data/{non_existing_sdoc_id}")

    assert resp.status_code == 403


def test_delete_source_document_by_id(
    client: TestClient,
    project_with_source_document,
):
    sdoc = project_with_source_document["source_document"]

    response = client.delete(f"/sdoc/{sdoc.id}")

    assert response.status_code == 200
    deleted = SourceDocumentRead.model_validate(response.json())
    assert deleted.id == sdoc.id
    assert deleted.project_id == sdoc.project_id

    # TODO: test more, repo etc.!


def test_delete_source_document_by_id_short_if_not_exists(
    client: TestClient,
):
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
    project_with_source_document,
    payload: dict,
):
    sdoc = project_with_source_document["source_document"]

    resp = client.patch(
        f"/sdoc/{sdoc.id}",
        json=payload,
    )

    assert resp.status_code == 200, f"Response: {resp.text}"
    updated = SourceDocumentRead.model_validate(resp.json())
    assert updated.id == sdoc.id
    assert updated.name == payload.get("name", sdoc.name)
    assert updated.filename == payload.get("filename", sdoc.filename)
    assert updated.doctype == sdoc.doctype


def test_update_sdoc_if_not_exists(
    client: TestClient,
):
    fake_id = 2000
    payload = SourceDocumentUpdate(
        name="New Name",
    )
    resp = client.patch(
        f"/sdoc/{fake_id}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 403


def test_get_same_folder_sdocs(client: TestClient, project_with_sdocs_in_same_folder):
    sdoc = project_with_sdocs_in_same_folder["source_documents"][0]
    sdoc_2 = project_with_sdocs_in_same_folder["source_documents"][1]

    resp = client.get(f"/sdoc/{sdoc.id}/same_folder")
    assert resp.status_code == 200

    ids = resp.json()
    assert ids == [sdoc.id, sdoc_2.id]


def test_get_same_folder_sdocs_if_not_exists(
    client: TestClient,
):
    fake_id = 2000
    response = client.get(
        f"/sdoc/{fake_id}/same_folder",
    )

    assert response.status_code == 403


# TODO Requires fix!
# def test_get_file_url(
#     client: TestClient,
#     simple_project: ProjectORM,
#     db_session: Session,
#     test_user: UserRead,
# ):
#     sdoc = crud_sdoc.create(
#         db=db_session,
#         create_dto=SourceDocumentCreate(
#             filename="sdoc.txt",
#             name="A",
#             doctype=DocType.text,
#             project_id=simple_project.id,
#             folder_id=None,
#         ),
#     )

#     db_session.commit()
#     db_session.refresh(sdoc)

#     response = client.get(f"/sdoc/{sdoc.id}/url")
#     assert response.status_code == 200


def test_get_file_url_if_not_exists(
    client: TestClient,
):
    fake_id = 2000
    response = client.get(f"/sdoc/{fake_id}/url")

    assert response.status_code == 403


def test_get_annotators_id(
    client: TestClient, project_with_sentence_annotation, test_user
):
    sdoc = project_with_sentence_annotation["source_document"]

    resp = client.get(f"/sdoc/{sdoc.id}/annotators")

    assert resp.status_code == 200
    assert test_user.id in resp.json()


def test_get_annotators_empty_when_no_annotations(
    client: TestClient,
    project_with_source_document,
):
    sdoc = project_with_source_document["source_document"]

    resp = client.get(f"/sdoc/{sdoc.id}/annotators")

    assert resp.status_code == 200
    assert resp.json() == []


def test_get_annotators_if_not_exists(client: TestClient):
    fake_id = 2000
    resp = client.get(f"/sdoc/{fake_id}/annotators")

    assert resp.status_code == 403
