import json

from fastapi.testclient import TestClient

from core.doc.source_document_crud import crud_sdoc
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo

SETTINGS_JSON = json.dumps(
    {
        "model": "default",
        "language": "en",
        "extract_images": False,
        "pages_per_chunk": 1,
        "keyword_number": 5,
        "keyword_deduplication_threshold": 0.1,
        "keyword_max_ngram_size": 3,
    }
)


def test_upload_file_to_project(client: TestClient, test_project):
    file_content = b"hello world"
    files = [
        ("uploaded_files", ("test.txt", file_content, "text/plain")),
    ]
    response = client.post(
        f"/docprocessing/project/{test_project.id}",
        data={"settings": SETTINGS_JSON},
        files=files,
    )

    assert response.status_code == 200, response.text
    assert response.json() == 1


def test_upload_with_unsupported_file_stores_nothing(client: TestClient, test_project):
    supported = ("uploaded_files", ("supported.txt", b"hello world", "text/plain"))
    unsupported = (
        "uploaded_files",
        ("unsupported.xyz", b"\x00\x01", "application/x-unsupported"),
    )

    # 1. the request with an unsupported file is rejected as a whole
    response = client.post(
        f"/docprocessing/project/{test_project.id}",
        data={"settings": SETTINGS_JSON},
        files=[supported, unsupported],
    )
    assert response.status_code == 406, response.text

    # 2. no file and no source document remain
    project_dir = FilesystemRepo().get_project_root_dir_path(project_id=test_project.id)
    assert list(project_dir.rglob("supported.txt")) == []
    with SQLRepo().transaction() as db:
        sdoc = crud_sdoc.read_by_filename(
            db=db,
            project_id=test_project.id,
            filename="supported.txt",
            only_finished=False,
        )
        assert sdoc is None

    # 3. uploading the supported file again succeeds
    response = client.post(
        f"/docprocessing/project/{test_project.id}",
        data={"settings": SETTINGS_JSON},
        files=[supported],
    )
    assert response.status_code == 200, response.text
    assert response.json() == 1
