import json

from fastapi.testclient import TestClient
from test.factories.project_factory import ProjectFactory

from core.user.user_orm import UserORM


def test_upload_file_to_project(
    client: TestClient,
    test_user: UserORM,
    project_factory: ProjectFactory,
):
    project = project_factory.create(creating_user_id=test_user.id)

    settings = {
        "language": "en",
        "extract_images": False,
        "pages_per_chunk": 1,
        "keyword_number": 5,
        "keyword_deduplication_threshold": 0.1,
        "keyword_max_ngram_size": 3,
    }
    # Die API erwartet einen JSON-String.

    settings_json = json.dumps(settings)
    # Simuliere den Upload einer Datei
    file_content = b"hello world"
    # multipart/form-data benötigt spezielle Struktur für Dateien
    files = [
        ("uploaded_files", ("test.txt", file_content, "text/plain")),
    ]
    # Sende die Anfrage an die API
    """
        Der Endpunkt zum Hochladen von Dateien.  settings_json wird als Form-Feld gesendet."""
    response = client.put(
        f"/docprocessing/project/{project.id}",
        data={"settings": settings_json},
        # Die hochzuladenden Dateien
        files=files,
    )
    # Ausgabe für Debugging-Zwecke
    print("STATUS:", response.status_code)
    print("BODY:", response.text)
    # Überprüfe die Antwort
    assert response.status_code == 200
    # Die Antwort sollte die Anzahl der hochgeladenen Dateien zurückgeben
    assert response.json() == 1
