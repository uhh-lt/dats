import json

import pytest
from fastapi.testclient import TestClient

from common.doc_type_enum import DocType
from pipeline_test_utils import all_steps, step_names

# ===========================================================================
# UPLOAD (/docprocessing/project/{project_id}) TESTS
# ===========================================================================


def test_upload_file_to_project(client: TestClient, test_project):
    settings = {
        "model": "default",
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
    response = client.post(
        f"/docprocessing/project/{test_project.id}",
        data={"settings": settings_json},
        files=files,
    )

    assert response.status_code == 200, response.text
    assert response.json() == 1


# ===========================================================================
# SEARCH COLUMNS (/docprocessing/searchColumns/{doctype}) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "doctype",
    [
        # extract_html, then the text steps
        pytest.param(DocType.text, id="text"),
        # the image steps, then the text steps on the caption
        pytest.param(DocType.image, id="image"),
        # the audio steps, then the text steps on the transcript
        pytest.param(DocType.audio, id="audio"),
        # the video steps, the transcription of the extracted audio, then the text steps
        pytest.param(DocType.video, id="video"),
    ],
)
def test_search_columns_lists_the_pipeline_steps_of_the_doctype_in_order(
    client: TestClient, doctype: DocType
):
    """The steps per doctype are derived from the requires/produces/doctypes
    declarations of the jobs, in pipeline order."""
    response = client.get(f"/docprocessing/searchColumns/{doctype.value}")

    assert response.status_code == 200, response.text
    assert response.json() == step_names(all_steps(doctype))
