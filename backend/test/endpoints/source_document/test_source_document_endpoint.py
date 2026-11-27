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


def _url(project_id: int, path: str = "") -> str:
    return f"/projects/{project_id}/source-documents{path}"


def test_get_source_document_by_id(client: TestClient, project_with_sdoc):
    sdoc = project_with_sdoc["source_document"]

    response = client.get(_url(sdoc.project_id, f"/{sdoc.id}"))

    assert response.status_code == 200, response.text
    data = SourceDocumentRead.model_validate(response.json())
    assert data.id == sdoc.id
    assert data.project_id == sdoc.project_id
    assert data.name == sdoc.name
    assert data.filename == sdoc.filename
    assert data.doctype == sdoc.doctype


def test_get_source_document_of_another_project_is_not_found(
    client: TestClient, project_with_sdoc, foreign_project_with_sdoc
):
    """A document of another project of the user is not found in the project of
    the path (404)."""
    project = project_with_sdoc["project"]
    foreign = foreign_project_with_sdoc["source_document"]

    response = client.get(_url(project.id, f"/{foreign.id}"))

    assert response.status_code == 404, response.text


@pytest.mark.parametrize(
    "path",
    [
        # the document
        pytest.param("", id="document"),
        # the document with its data
        pytest.param("/data", id="data"),
    ],
)
def test_get_unfinished_document_only_if_finished_is_a_conflict(
    client: TestClient, project_with_unfinished_sdoc, path: str
):
    """A document whose processing is unfinished answers 409 with
    `only_if_finished=true` and 200 without the flag (the default is false)."""
    sdoc = project_with_unfinished_sdoc["source_document"]

    response = client.get(
        _url(sdoc.project_id, f"/{sdoc.id}{path}"),
        params={"only_if_finished": True},
    )
    assert response.status_code == 409, response.text

    response = client.get(_url(sdoc.project_id, f"/{sdoc.id}{path}"))
    assert response.status_code == 200, response.text


@pytest.mark.parametrize(
    "path",
    [
        # the document
        pytest.param("", id="document"),
        # the document with its data
        pytest.param("/data", id="data"),
    ],
)
def test_get_finished_document_only_if_finished(
    client: TestClient, project_with_sdoc, path: str
):
    """A finished document (no step is unfinished) answers 200 with
    `only_if_finished=true`."""
    sdoc = project_with_sdoc["source_document"]

    response = client.get(
        _url(sdoc.project_id, f"/{sdoc.id}{path}"),
        params={"only_if_finished": True},
    )

    assert response.status_code == 200, response.text


def test_get_by_id_with_data(
    client: TestClient,
    project_with_sdoc,
):
    sdoc = project_with_sdoc["source_document"]
    data = project_with_sdoc["source_document_data"]

    resp = client.get(_url(sdoc.project_id, f"/{sdoc.id}/data"))
    assert resp.status_code == 200, resp.text
    data_read = SourceDocumentDataRead.model_validate(resp.json())

    assert data_read.id == data.id
    assert data_read.html == data.html


def test_get_data_of_another_project_is_not_found(
    client: TestClient, project_with_sdoc, foreign_project_with_sdoc
):
    """The data of a document of another project is not found (404)."""
    project = project_with_sdoc["project"]
    foreign = foreign_project_with_sdoc["source_document"]

    resp = client.get(_url(project.id, f"/{foreign.id}/data"))

    assert resp.status_code == 404, resp.text


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

    response = client.delete(_url(sdoc.project_id, f"/{sdoc.id}"))

    assert response.status_code == 200, response.text
    deleted = SourceDocumentRead.model_validate(response.json())
    assert deleted.id == sdoc.id
    assert deleted.project_id == sdoc.project_id
    assert client.get(_url(sdoc.project_id, f"/{sdoc.id}")).status_code == 404
    assert not file_path.exists()
    index_name = crud_sdoc_elastic.index.get_index_name(project_id=sdoc.project_id)
    assert not es_client.exists(index=index_name, id=str(sdoc.id))
    assert (
        client.get(f"/projects/{sdoc.project_id}/folders/{folder_id}").status_code
        == 404
    )


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

    response = client.delete(_url(image.project_id, f"/{image.id}"))

    assert response.status_code == 200, response.text
    assert [folder.exists() for folder in folders] == [False, False, False]


def test_delete_source_document_of_another_project_is_not_found(
    client: TestClient, project_with_sdoc, foreign_project_with_sdoc
):
    """Deleting a document of another project answers 404 and keeps it."""
    project = project_with_sdoc["project"]
    foreign = foreign_project_with_sdoc["source_document"]

    response = client.delete(_url(project.id, f"/{foreign.id}"))

    assert response.status_code == 404, response.text
    assert client.get(_url(foreign.project_id, f"/{foreign.id}")).status_code == 200


def test_delete_sdocs_bulk(client: TestClient, project_with_sdocs_in_same_folder):
    """Bulk delete removes all documents; documents without a file or an
    Elasticsearch document are deleted as well."""
    sdocs = project_with_sdocs_in_same_folder["source_documents"]
    sdoc_ids = [sdoc.id for sdoc in sdocs]

    response = client.request(
        "DELETE", _url(sdocs[0].project_id, "/bulk"), json=sdoc_ids
    )

    assert response.status_code == 200, response.text
    deleted = [SourceDocumentRead.model_validate(r) for r in response.json()]
    assert sorted(d.id for d in deleted) == sorted(sdoc_ids)
    for sdoc_id in sdoc_ids:
        assert client.get(_url(sdocs[0].project_id, f"/{sdoc_id}")).status_code == 404
    # the SDOC_FOLDER of both documents is empty now and deleted as well
    folder = project_with_sdocs_in_same_folder["folder"]
    assert (
        client.get(f"/projects/{folder.project_id}/folders/{folder.id}").status_code
        == 404
    )


def test_delete_sdoc_keeps_sdoc_folder_with_other_sdocs(
    client: TestClient, project_with_sdocs_in_same_folder
):
    """An SDOC_FOLDER that still holds another document is kept."""
    sdoc, other_sdoc = project_with_sdocs_in_same_folder["source_documents"]
    folder = project_with_sdocs_in_same_folder["folder"]

    response = client.delete(_url(sdoc.project_id, f"/{sdoc.id}"))

    assert response.status_code == 200, response.text
    assert (
        client.get(f"/projects/{folder.project_id}/folders/{folder.id}").status_code
        == 200
    )
    assert (
        client.get(_url(other_sdoc.project_id, f"/{other_sdoc.id}")).status_code == 200
    )


def test_delete_sdoc_keeps_empty_normal_folder(
    client: TestClient, db_session, test_project
):
    """A NORMAL folder is never deleted with its documents, even when empty."""
    folder = crud_folder.create(
        db=db_session,
        project_id=test_project.id,
        create_dto=FolderCreate(
            name="Normal Folder",
            folder_type=FolderType.NORMAL,
            parent_id=None,
        ),
    )
    sdoc = crud_sdoc.create(
        db=db_session,
        project_id=test_project.id,
        create_dto=SourceDocumentCreate(
            filename="normal_folder_document.txt",
            name="Normal Folder Document",
            doctype=DocType.text,
            folder_id=folder.id,
        ),
    )
    db_session.commit()

    response = client.request("DELETE", _url(test_project.id, "/bulk"), json=[sdoc.id])

    assert response.status_code == 200, response.text
    assert client.get(_url(sdoc.project_id, f"/{sdoc.id}")).status_code == 404
    assert (
        client.get(f"/projects/{folder.project_id}/folders/{folder.id}").status_code
        == 200
    )


def test_delete_sdocs_bulk_if_not_exists(client: TestClient, test_project):
    """An id that does not exist in the project is not found (404)."""
    response = client.request("DELETE", _url(test_project.id, "/bulk"), json=[999999])

    assert response.status_code == 404, response.text


def test_delete_sdocs_bulk_rejects_batch_with_a_document_of_another_project(
    client: TestClient, project_with_sdoc, foreign_project_with_sdoc
):
    """All-or-nothing: a document of another project in the batch rejects the
    whole request (404) and deletes nothing."""
    sdoc = project_with_sdoc["source_document"]
    foreign = foreign_project_with_sdoc["source_document"]

    response = client.request(
        "DELETE", _url(sdoc.project_id, "/bulk"), json=[sdoc.id, foreign.id]
    )

    assert response.status_code == 404, response.text
    assert client.get(_url(foreign.project_id, f"/{foreign.id}")).status_code == 200
    # All-or-nothing: the valid sdoc must NOT have been deleted.
    assert client.get(_url(sdoc.project_id, f"/{sdoc.id}")).status_code == 200


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
        _url(sdoc.project_id, f"/{sdoc.id}"),
        json=payload,
    )

    assert resp.status_code == 200, resp.text
    updated = SourceDocumentRead.model_validate(resp.json())
    assert updated.id == sdoc.id
    assert updated.name == payload.get("name", sdoc.name)
    assert updated.filename == payload.get("filename", sdoc.filename)
    assert updated.doctype == sdoc.doctype


def test_update_sdoc_of_another_project_is_not_found(
    client: TestClient, project_with_sdoc, foreign_project_with_sdoc
):
    """Updating a document of another project answers 404."""
    project = project_with_sdoc["project"]
    foreign = foreign_project_with_sdoc["source_document"]
    payload = SourceDocumentUpdate(name="New Name")

    resp = client.patch(
        _url(project.id, f"/{foreign.id}"),
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 404, resp.text


def test_update_sdoc_into_a_folder_of_another_project_is_a_conflict(
    client: TestClient, project_with_sdoc, foreign_project_with_sdoc
):
    """Moving a document into a folder of another project is rejected by the
    composite foreign key (409)."""
    sdoc = project_with_sdoc["source_document"]
    foreign = foreign_project_with_sdoc["source_document"]

    resp = client.patch(
        _url(sdoc.project_id, f"/{sdoc.id}"),
        json=SourceDocumentUpdate(folder_id=foreign.folder_id).model_dump(
            exclude_unset=True
        ),
    )

    assert resp.status_code == 409, resp.text


def test_update_sdoc_cannot_write_step_statuses(client: TestClient, project_with_sdoc):
    """The step statuses are no fields of the update: a status next to the name
    is ignored, so the finished document stays readable (GET rejects
    unfinished documents), and a status alone is an empty update (422)."""
    sdoc = project_with_sdoc["source_document"]

    with_name = client.patch(
        _url(sdoc.project_id, f"/{sdoc.id}"),
        json={"name": "Renamed", "tokens_sentences": -100},
    )
    status_only = client.patch(
        _url(sdoc.project_id, f"/{sdoc.id}"), json={"tokens_sentences": -100}
    )

    assert with_name.status_code == 200, with_name.text
    assert status_only.status_code == 422, status_only.text
    assert client.get(_url(sdoc.project_id, f"/{sdoc.id}")).status_code == 200


def test_get_same_folder_sdocs(client: TestClient, project_with_sdocs_in_same_folder):
    sdoc = project_with_sdocs_in_same_folder["source_documents"][0]
    sdoc_2 = project_with_sdocs_in_same_folder["source_documents"][1]

    resp = client.get(_url(sdoc.project_id, f"/{sdoc.id}/same-folder"))
    assert resp.status_code == 200, resp.text

    ids = resp.json()
    assert ids == [sdoc.id, sdoc_2.id]


def test_get_same_folder_sdocs_of_another_project_is_not_found(
    client: TestClient, project_with_sdoc, foreign_project_with_sdoc
):
    project = project_with_sdoc["project"]
    foreign = foreign_project_with_sdoc["source_document"]

    response = client.get(_url(project.id, f"/{foreign.id}/same-folder"))

    assert response.status_code == 404, response.text


def test_get_urls_of_a_text_document(client: TestClient, project_with_sdoc):
    """A text document has the URL of its uploaded file, and no image or
    thumbnail."""
    sdoc = project_with_sdoc["source_document"]

    response = client.get(_url(sdoc.project_id, f"/{sdoc.id}/urls"))

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

    response = client.get(_url(image.project_id, f"/{image.id}/urls"))

    assert response.status_code == 200, response.text
    assert SourceDocumentUrls.model_validate(response.json()) == SourceDocumentUrls(
        file_url=f"{folder}/sdoc_files/{image.id}/photo.png",
        image_url=f"{folder}/web_images/{image.id}/image.webp",
        thumbnail_url=f"{folder}/thumbnails/{image.id}/thumbnail.webp",
    )


def test_get_urls_of_another_project_is_not_found(
    client: TestClient, project_with_sdoc, foreign_project_with_sdoc
):
    project = project_with_sdoc["project"]
    foreign = foreign_project_with_sdoc["source_document"]

    response = client.get(_url(project.id, f"/{foreign.id}/urls"))

    assert response.status_code == 404, response.text


def test_get_annotators_id(
    client: TestClient, project_with_sentence_annotation, test_user
):
    sdoc = project_with_sentence_annotation["source_document"]

    resp = client.get(_url(sdoc.project_id, f"/{sdoc.id}/annotators"))

    assert resp.status_code == 200, resp.text
    assert test_user.id in resp.json()


def test_get_annotators_empty_when_no_annotations(
    client: TestClient,
    project_with_sdoc,
):
    sdoc = project_with_sdoc["source_document"]

    resp = client.get(_url(sdoc.project_id, f"/{sdoc.id}/annotators"))

    assert resp.status_code == 200, resp.text
    assert resp.json() == []


def test_get_annotators_of_another_project_is_not_found(
    client: TestClient, project_with_sdoc, foreign_project_with_sdoc
):
    project = project_with_sdoc["project"]
    foreign = foreign_project_with_sdoc["source_document"]

    resp = client.get(_url(project.id, f"/{foreign.id}/annotators"))

    assert resp.status_code == 404, resp.text


# ===========================================================================
# COUNT (/projects/{project_id}/source-documents/count) TESTS
# ===========================================================================


def test_count_sdocs_counts_the_documents_of_the_project(
    client: TestClient, project_with_sdoc, foreign_project_with_sdoc
):
    """The count covers the documents of the path's project only; the document of
    `project_with_sdoc` has no planned steps, so it counts as finished."""
    project = project_with_sdoc["project"]

    all_response = client.get(_url(project.id, "/count"))
    finished = client.get(_url(project.id, "/count"), params={"status": 1})

    assert all_response.status_code == 200, all_response.text
    assert all_response.json() == 1
    assert finished.status_code == 200, finished.text
    assert finished.json() == 1


def test_count_sdocs_with_date_metadata_counts_the_documents_with_a_date(
    client: TestClient, project_with_date_metadata
):
    """The text document has a date for the text key "published", the image
    document has none: one of the two documents of the project is counted."""
    project_id = project_with_date_metadata["project"].id
    metadata_id = project_with_date_metadata["date_metadata"].id

    response = client.get(
        _url(project_id, "/count"), params={"date_metadata_id": metadata_id}
    )

    assert response.status_code == 200, response.text
    assert response.json() == 1


def test_count_sdocs_with_date_metadata_of_another_project_matches_nothing(
    client: TestClient, project_with_date_metadata, foreign_date_metadata
):
    """The date key of another project of the user matches no document of the
    path's project, although its own document has a date."""
    project_id = project_with_date_metadata["project"].id

    response = client.get(
        _url(project_id, "/count"),
        params={"date_metadata_id": foreign_date_metadata.id},
    )

    assert response.status_code == 200, response.text
    assert response.json() == 0


# ===========================================================================
# GET BY FILENAME (/projects/{project_id}/source-documents?filename=) TESTS
# ===========================================================================


def test_get_by_filename_returns_the_document(client: TestClient, project_with_sdoc):
    """The filename names one document: a list of one."""
    sdoc = project_with_sdoc["source_document"]

    response = client.get(_url(sdoc.project_id), params={"filename": sdoc.filename})

    assert response.status_code == 200, response.text
    assert [SourceDocumentRead.model_validate(d).id for d in response.json()] == [
        sdoc.id
    ]


def test_get_by_filename_of_an_unknown_filename_is_empty(
    client: TestClient, project_with_sdoc
):
    """A filename no document of the project has gives an empty list, no 404."""
    project = project_with_sdoc["project"]

    response = client.get(_url(project.id), params={"filename": "missing.txt"})

    assert response.status_code == 200, response.text
    assert response.json() == []


def test_get_by_filename_matches_no_document_of_another_project(
    client: TestClient, test_project, foreign_project_with_sdoc
):
    """The filename of a document of another project matches nothing: an empty
    list."""
    foreign = foreign_project_with_sdoc["source_document"]

    response = client.get(_url(test_project.id), params={"filename": foreign.filename})

    assert response.status_code == 200, response.text
    assert response.json() == []
