import json

import pytest
from fastapi.testclient import TestClient

from core.doc.source_document_crud import crud_sdoc
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from feature_test_utils import FeatureProject
from modules.doc_processing.doc_processing_dto import SdocHealthResult, SdocHealthSort
from pipeline_test_utils import all_steps, step_names
from systems.search_system.sorting import SortDirection

# ===========================================================================
# UPLOAD (/docprocessing/project/{project_id}) TESTS
# ===========================================================================


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
# ===========================================================================
# SEARCH SDOC HEALTH (/docprocessing/project/{project_id}/search) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "sorts,page_size,expected",
    [
        # processing (0) before finished (1)
        pytest.param(
            [(JobType.TEXT_LANGUAGE_DETECTION, SortDirection.ASC)],
            2,
            ["text_running.txt", "text_done.txt"],
            id="step-asc",
        ),
        pytest.param(
            [(JobType.TEXT_LANGUAGE_DETECTION, SortDirection.DESC)],
            2,
            ["text_done.txt", "text_running.txt"],
            id="step-desc",
        ),
        # not planned for both, so the name decides
        pytest.param(
            [(JobType.TEXT_KEYWORDS, SortDirection.DESC)],
            2,
            ["text_done.txt", "text_running.txt"],
            id="step-not-planned",
        ),
        # a column of the document, then a page of one
        pytest.param(
            [("name", SortDirection.DESC)], 1, ["text_running.txt"], id="column-page"
        ),
    ],
)
def test_search_sdoc_health_sorts_by_the_status_of_a_step_or_a_column(
    client: TestClient,
    feature_project: FeatureProject,
    sorts: list[tuple[str, SortDirection]],
    page_size: int,
    expected: list[str],
):
    """The text documents of `feature_project` sorted by the status of a step
    (documents without the step last) or a column, then by name; the total
    counts all text documents."""
    response = client.post(
        f"/docprocessing/project/{feature_project['project'].id}/search",
        params={"doctype": DocType.text.value, "page": 0, "page_size": page_size},
        json=[
            SdocHealthSort(column=column, direction=direction).model_dump()
            for column, direction in sorts
        ],
    )

    assert response.status_code == 200, response.text
    result = SdocHealthResult.model_validate(response.json())
    assert [row.name for row in result.data] == expected
    assert result.total_results == 2


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
