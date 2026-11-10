import json

import pytest
from fastapi.testclient import TestClient

from common.doc_type_enum import DocType

# The steps per doctype before they were derived from the step declarations
# (common/doc_processing_steps.py): the derived lists must not change.
TEXT_STEPS = [
    "text_extraction",
    "text_language_detection",
    "text_spacy",
    "text_es_index",
    "text_sentence_embedding",
    "text_html_mapping",
]
STEPS_BY_DOCTYPE = {
    DocType.text: ["extract_html", *TEXT_STEPS],
    DocType.image: [
        "image_caption",
        "image_embedding",
        "image_metadata_extraction",
        "image_thumbnail",
        "image_object_detection",
        *TEXT_STEPS,
    ],
    DocType.audio: [
        "audio_metadata",
        "audio_thumbnail",
        "audio_transcription",
        *TEXT_STEPS,
    ],
    DocType.video: [
        "video_metadata",
        "video_thumbnail",
        "video_audio_extraction",
        "audio_transcription",
        *TEXT_STEPS,
    ],
}


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
    declarations of the jobs; they equal the former hand-written lists, in the
    same order."""
    response = client.get(f"/docprocessing/searchColumns/{doctype.value}")

    assert response.status_code == 200, response.text
    assert response.json() == STEPS_BY_DOCTYPE[doctype]
