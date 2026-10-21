from typing import TypedDict

import pytest
from fastapi.testclient import TestClient

from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.sdoc_elastic_dto import ElasticSearchDocumentCreate
from core.doc.source_document_data_dto import (
    SourceDocumentDataRead,
)
from core.doc.source_document_dto import (
    SourceDocumentRead,
    SourceDocumentUpdate,
)
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo


class ProjectWithSourceDocumentForTest(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM


def test_get_source_document_by_id(client: TestClient, project_with_sdoc):
    sdoc = project_with_sdoc["source_document"]

    response = client.get(f"/sdoc/{sdoc.id}")

    assert response.status_code == 200, response.text
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

    assert response.status_code == 403, response.text


def test_get_by_id_with_data(
    client: TestClient,
    project_with_sdoc,
):
    sdoc = project_with_sdoc["source_document"]
    data = project_with_sdoc["source_document_data"]

    resp = client.get(f"/sdoc/data/{sdoc.id}")
    assert resp.status_code == 200, resp.text
    data_read = SourceDocumentDataRead.model_validate(resp.json())

    assert data_read.id == data.id
    assert data_read.repo_url == data.repo_url
    assert data_read.html == data.html


def test_get_by_id_with_data_if_not_exsisit(
    client: TestClient,
):
    non_existing_sdoc_id = 2000
    resp = client.get(f"/sdoc/data/{non_existing_sdoc_id}")

    assert resp.status_code == 403, resp.text


def test_delete_source_document_by_id(
    client: TestClient,
    project_with_sdoc,
):
    """Deleting a document removes its row, its file and its Elasticsearch document."""
    sdoc = project_with_sdoc["source_document"]
    es_client = ElasticSearchRepo().get_client()
    crud_sdoc_elastic.create(
        client=es_client,
        project_id=sdoc.project_id,
        create_dto=ElasticSearchDocumentCreate(
            filename=sdoc.filename,
            content="This is a test document.",
            sdoc_id=sdoc.id,
            project_id=sdoc.project_id,
        ),
    )
    file_path = FilesystemRepo().get_path_to_sdoc_file(
        sdoc=SourceDocumentRead.model_validate(sdoc)
    )
    assert file_path.exists()

    response = client.delete(f"/sdoc/{sdoc.id}")

    assert response.status_code == 200, response.text
    deleted = SourceDocumentRead.model_validate(response.json())
    assert deleted.id == sdoc.id
    assert deleted.project_id == sdoc.project_id
    assert client.get(f"/sdoc/{sdoc.id}").status_code == 403
    assert not file_path.exists()
    index_name = crud_sdoc_elastic.index.get_index_name(project_id=sdoc.project_id)
    assert not es_client.exists(index=index_name, id=str(sdoc.id))


def test_delete_source_document_by_id_short_if_not_exists(
    client: TestClient,
):
    fake_id = 3000
    response = client.delete(f"/sdoc/{fake_id}")

    assert response.status_code == 403, response.text


def test_delete_sdocs_bulk(client: TestClient, project_with_sdocs_in_same_folder):
    """Bulk delete removes all documents; documents without a file or an
    Elasticsearch document are deleted as well."""
    sdocs = project_with_sdocs_in_same_folder["source_documents"]
    sdoc_ids = [sdoc.id for sdoc in sdocs]

    response = client.request("DELETE", "/sdoc/bulk/delete", json=sdoc_ids)

    assert response.status_code == 200, response.text
    deleted = [SourceDocumentRead.model_validate(r) for r in response.json()]
    assert sorted(d.id for d in deleted) == sorted(sdoc_ids)
    for sdoc_id in sdoc_ids:
        assert client.get(f"/sdoc/{sdoc_id}").status_code == 403


def test_delete_sdocs_bulk_if_not_exists(
    client: TestClient,
):
    """assert_in_same_project_as_many authorizes first, so an unknown id -> 403."""
    response = client.request("DELETE", "/sdoc/bulk/delete", json=[999999])

    assert response.status_code == 403, response.text


def test_delete_sdocs_bulk_rejects_batch_with_unknown_id(
    client: TestClient, project_with_sdoc
):
    """All-or-nothing: an unknown id in the batch rejects the whole request (403)
    and deletes nothing."""
    sdoc = project_with_sdoc["source_document"]

    response = client.request("DELETE", "/sdoc/bulk/delete", json=[sdoc.id, 999999])

    assert response.status_code == 403, response.text
    # All-or-nothing: the valid sdoc must NOT have been deleted.
    assert client.get(f"/sdoc/{sdoc.id}").status_code == 200


testdata_sdoc_update = [
    pytest.param({"name": "New Title"}, id="update_name"),
]


@pytest.mark.parametrize("payload", testdata_sdoc_update)
def test_update_sdoc_parametrized(
    client: TestClient,
    project_with_sdoc,
    payload: dict,
):
    sdoc = project_with_sdoc["source_document"]

    resp = client.patch(
        f"/sdoc/{sdoc.id}",
        json=payload,
    )

    assert resp.status_code == 200, resp.text
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

    assert resp.status_code == 403, resp.text


def test_get_same_folder_sdocs(client: TestClient, project_with_sdocs_in_same_folder):
    sdoc = project_with_sdocs_in_same_folder["source_documents"][0]
    sdoc_2 = project_with_sdocs_in_same_folder["source_documents"][1]

    resp = client.get(f"/sdoc/{sdoc.id}/same_folder")
    assert resp.status_code == 200, resp.text

    ids = resp.json()
    assert ids == [sdoc.id, sdoc_2.id]


def test_get_same_folder_sdocs_if_not_exists(
    client: TestClient,
):
    fake_id = 2000
    response = client.get(
        f"/sdoc/{fake_id}/same_folder",
    )

    assert response.status_code == 403, response.text


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
#     assert response.status_code == 200, response.text


def test_get_file_url_if_not_exists(
    client: TestClient,
):
    fake_id = 2000
    response = client.get(f"/sdoc/{fake_id}/url")

    assert response.status_code == 403, response.text


def test_get_annotators_id(
    client: TestClient, project_with_sentence_annotation, test_user
):
    sdoc = project_with_sentence_annotation["source_document"]

    resp = client.get(f"/sdoc/{sdoc.id}/annotators")

    assert resp.status_code == 200, resp.text
    assert test_user.id in resp.json()


def test_get_annotators_empty_when_no_annotations(
    client: TestClient,
    project_with_sdoc,
):
    sdoc = project_with_sdoc["source_document"]

    resp = client.get(f"/sdoc/{sdoc.id}/annotators")

    assert resp.status_code == 200, resp.text
    assert resp.json() == []


def test_get_annotators_if_not_exists(client: TestClient):
    fake_id = 2000
    resp = client.get(f"/sdoc/{fake_id}/annotators")

    assert resp.status_code == 403, resp.text
