import json

from fastapi.testclient import TestClient


def test_upload_file_to_project(client: TestClient, test_project):
    settings = {
        "language": "en",
        "extract_images": False,
        "pages_per_chunk": 1,
        "keyword_number": 5,
        "keyword_deduplication_threshold": 0.1,
        "keyword_max_ngram_size": 3,
    }
    settings_json = json.dumps(settings)
    file_content = b"hello world"
    files = [
        ("uploaded_files", ("test.txt", file_content, "text/plain")),
    ]
    response = client.put(
        f"/docprocessing/project/{test_project.id}",
        data={"settings": settings_json},
        files=files,
    )

    assert response.status_code == 200
    assert response.json() == 1
