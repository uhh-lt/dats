from typing import TypedDict

import pytest
from fastapi.testclient import TestClient

from common.doc_type_enum import DocType
from core.artefacts.thumbnail.thumbnail_file_crud import crud_thumbnail_file
from core.artefacts.thumbnail.web_image_file_crud import crud_web_image_file
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate
from core.doc.folder_enum import FolderType
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.sdoc_elastic_dto import ElasticSearchDocumentCreate
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_dto import (
    SourceDocumentDataRead,
)
from core.doc.source_document_dto import (
    SourceDocumentCreate,
    SourceDocumentRead,
    SourceDocumentUpdate,
    SourceDocumentUrls,
)
from core.doc.source_document_file_crud import crud_sdoc_file
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from repos.elastic.elastic_repo import ElasticSearchRepo

from .conftest import ProjectWithImage


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
    """Deleting a document removes its row, its file, its Elasticsearch document
    and its SDOC_FOLDER, which is empty afterwards."""
    sdoc = project_with_sdoc["source_document"]
    folder_id = sdoc.folder_id
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
    file_path = crud_sdoc_file.path(
        project_id=sdoc.project_id, id=sdoc.id, name=sdoc.filename
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
    assert client.get(f"/folder/{folder_id}").status_code == 403


def test_delete_image_removes_all_its_files(
    client: TestClient, project_with_image: ProjectWithImage
):
    """Deleting an image removes the folders of its uploaded file, its web
    image and its thumbnail."""
    image = project_with_image["image"]
    folders = [
        crud_sdoc_file.dir(project_id=image.project_id, id=image.id),
        crud_web_image_file.dir(project_id=image.project_id, id=image.id),
        crud_thumbnail_file.dir(project_id=image.project_id, id=image.id),
    ]
    assert all(folder.is_dir() for folder in folders)

    response = client.delete(f"/sdoc/{image.id}")

    assert response.status_code == 200, response.text
    assert [folder.exists() for folder in folders] == [False, False, False]


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
    # the SDOC_FOLDER of both documents is empty now and deleted as well
    folder = project_with_sdocs_in_same_folder["folder"]
    assert client.get(f"/folder/{folder.id}").status_code == 403


def test_delete_sdoc_keeps_sdoc_folder_with_other_sdocs(
    client: TestClient, project_with_sdocs_in_same_folder
):
    """An SDOC_FOLDER that still holds another document is kept."""
    sdoc, other_sdoc = project_with_sdocs_in_same_folder["source_documents"]
    folder = project_with_sdocs_in_same_folder["folder"]

    response = client.delete(f"/sdoc/{sdoc.id}")

    assert response.status_code == 200, response.text
    assert client.get(f"/folder/{folder.id}").status_code == 200
    assert client.get(f"/sdoc/{other_sdoc.id}").status_code == 200


def test_delete_sdoc_keeps_empty_normal_folder(
    client: TestClient, db_session, test_project
):
    """A NORMAL folder is never deleted with its documents, even when empty."""
    folder = crud_folder.create(
        db=db_session,
        create_dto=FolderCreate(
            name="Normal Folder",
            folder_type=FolderType.NORMAL,
            parent_id=None,
            project_id=test_project.id,
        ),
    )
    sdoc = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="normal_folder_document.txt",
            name="Normal Folder Document",
            doctype=DocType.text,
            project_id=test_project.id,
            folder_id=folder.id,
        ),
    )
    db_session.commit()

    response = client.request("DELETE", "/sdoc/bulk/delete", json=[sdoc.id])

    assert response.status_code == 200, response.text
    assert client.get(f"/sdoc/{sdoc.id}").status_code == 403
    assert client.get(f"/folder/{folder.id}").status_code == 200


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


def test_update_sdoc_cannot_write_step_statuses(client: TestClient, project_with_sdoc):
    """The step statuses are no fields of the update: a status next to the name
    is ignored, so the finished document stays readable (GET /sdoc rejects
    unfinished documents), and a status alone is an empty update (422)."""
    sdoc = project_with_sdoc["source_document"]

    with_name = client.patch(
        f"/sdoc/{sdoc.id}", json={"name": "Renamed", "tokens_sentences": -100}
    )
    status_only = client.patch(f"/sdoc/{sdoc.id}", json={"tokens_sentences": -100})

    assert with_name.status_code == 200, with_name.text
    assert status_only.status_code == 422, status_only.text
    assert client.get(f"/sdoc/{sdoc.id}").status_code == 200


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


def test_get_urls_of_a_text_document(client: TestClient, project_with_sdoc):
    """A text document has the URL of its uploaded file, and no image or
    thumbnail."""
    sdoc = project_with_sdoc["source_document"]

    response = client.get(f"/sdoc/{sdoc.id}/urls")

    assert response.status_code == 200, response.text
    assert SourceDocumentUrls.model_validate(response.json()) == SourceDocumentUrls(
        file_url=f"projects/{sdoc.project_id}/sdoc_files/{sdoc.id}/{sdoc.filename}",
        image_url=None,
        thumbnail_url=None,
    )


def test_get_urls_of_an_image_with_its_thumbnails(
    client: TestClient, project_with_image: ProjectWithImage
):
    """An image has the URLs of its uploaded file, its web image and its
    thumbnail."""
    image = project_with_image["image"]
    folder = f"projects/{image.project_id}"

    response = client.get(f"/sdoc/{image.id}/urls")

    assert response.status_code == 200, response.text
    assert SourceDocumentUrls.model_validate(response.json()) == SourceDocumentUrls(
        file_url=f"{folder}/sdoc_files/{image.id}/photo.png",
        image_url=f"{folder}/web_images/{image.id}/image.webp",
        thumbnail_url=f"{folder}/thumbnails/{image.id}/thumbnail.webp",
    )


def test_get_urls_if_not_exists(
    client: TestClient,
):
    fake_id = 2000
    response = client.get(f"/sdoc/{fake_id}/urls")

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
