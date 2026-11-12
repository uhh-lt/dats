import json

import pytest
from fastapi.testclient import TestClient

from core.doc.source_document_crud import crud_sdoc
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.languages_enum import Language
from feature_test_utils import FeatureProject
from job_test_utils import HeldJobs, unreachable_redis
from modules.doc_processing.doc_processing_dto import (
    ProcessingSettings,
    SdocHealthResult,
    SdocHealthSort,
)
from pipeline_test_utils import (
    all_steps,
    failing_started_hook,
    read_step_status,
    started_steps,
    step_names,
)
from systems.job_system.job_system_enum import JobStatus
from systems.search_system.sorting import SortDirection

from .conftest import RecomputeProject

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
    language=Language.auto,
    model="default",
)

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


# ===========================================================================
# RETRY (/docprocessing/project/{project_id}/retry) TESTS
# ===========================================================================


def test_retry_requeues_a_failed_step_job_which_runs(
    client: TestClient,
    db_session,
    recompute_project: RecomputeProject,
    held_jobs: HeldJobs,
):
    """A recomputed text extraction of text_done fails (its started hook
    raises) and its step becomes erroneous. Retrying the document requeues the
    stored job, which runs and sets the step finished."""
    p = recompute_project
    sdoc_id = p["text_done"].id
    response = _recompute(client, p["project"].id, JobType.TEXT_EXTRACTION, [sdoc_id])
    assert response.status_code == 200, response.text
    with failing_started_hook():
        held_jobs.run(JobType.TEXT_EXTRACTION)
    assert read_step_status(db_session, sdoc_id, JobType.TEXT_EXTRACTION) == -100

    response = client.post(
        f"/docprocessing/project/{p['project'].id}/retry",
        params={"doctype": DocType.text.value},
        json=[sdoc_id],
    )

    assert response.status_code == 200, response.text
    assert response.json().startswith("Retried 1 / 1 jobs")
    held_jobs.run(JobType.TEXT_EXTRACTION)
    (job,) = held_jobs.ran(JobType.TEXT_EXTRACTION)
    assert job.get_status() == JobStatus.FINISHED
    assert read_step_status(db_session, sdoc_id, JobType.TEXT_EXTRACTION) == 1


# ===========================================================================
# RECOMPUTE (/docprocessing/project/{project_id}/recompute) TESTS
# ===========================================================================


def _recompute(client: TestClient, project_id: int, step: JobType, sdoc_ids: list[int]):
    return client.post(
        f"/docprocessing/project/{project_id}/recompute",
        params={"processing_step": step.value},
        json={"sdoc_ids": sdoc_ids, "settings": SETTINGS.model_dump(mode="json")},
    )


def test_recompute_starts_the_step_of_each_document(
    client: TestClient,
    recompute_project: RecomputeProject,
    held_jobs: HeldJobs,
):
    """Recomputing the language detection of text_done starts one job for that
    step only and answers with the number of started jobs."""
    p = recompute_project
    sdoc_id = p["text_done"].id

    response = _recompute(
        client, p["project"].id, JobType.TEXT_LANGUAGE_DETECTION, [sdoc_id]
    )

    assert response.status_code == 200, response.text
    assert response.json() == 1
    assert started_steps(held_jobs) == {sdoc_id: [JobType.TEXT_LANGUAGE_DETECTION]}


def test_recompute_of_a_document_without_input_data_marks_it_erroneous(
    client: TestClient,
    db_session,
    recompute_project: RecomputeProject,
    held_jobs: HeldJobs,
):
    """The language detection of no_data cannot start: it and the pending
    steps after it (spaCy and the HTML mapping) become erroneous, text_done
    after it in the list still starts, and the answer counts the one started
    job."""
    p = recompute_project
    no_data = p["no_data"].id

    response = _recompute(
        client,
        p["project"].id,
        JobType.TEXT_LANGUAGE_DETECTION,
        [no_data, p["text_done"].id],
    )

    assert response.status_code == 200, response.text
    assert response.json() == 1
    assert started_steps(held_jobs) == {
        p["text_done"].id: [JobType.TEXT_LANGUAGE_DETECTION]
    }
    steps = [
        JobType.TEXT_EXTRACTION,
        JobType.TEXT_LANGUAGE_DETECTION,
        JobType.TEXT_SPACY,
        JobType.TEXT_HTML_MAPPING,
    ]
    assert [read_step_status(db_session, no_data, s) for s in steps] == [
        1,
        -100,
        -100,
        -100,
    ]


def test_recompute_with_an_unreachable_queue_fails_and_marks_nothing(
    client: TestClient,
    db_session,
    recompute_project: RecomputeProject,
    held_jobs: HeldJobs,
):
    """If the queue cannot be reached, the request answers 503 and no step
    changes its status."""
    p = recompute_project
    sdoc_id = p["text_done"].id

    with unreachable_redis():
        response = _recompute(
            client, p["project"].id, JobType.TEXT_LANGUAGE_DETECTION, [sdoc_id]
        )

    assert response.status_code == 503, response.text
    assert "The job queue cannot be reached" in response.text
    assert held_jobs.jobs() == []
    assert read_step_status(db_session, sdoc_id, JobType.TEXT_LANGUAGE_DETECTION) == 1
