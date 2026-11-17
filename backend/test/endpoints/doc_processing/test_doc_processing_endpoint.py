import json

import pytest
from fastapi.testclient import TestClient

from common.doc_type_enum import DocType
from common.languages_enum import Language
from core.doc.source_document_crud import crud_sdoc
from core.doc_processing.doc_processing_dto import (
    SdocHealthColumn,
    SdocHealthResult,
    SdocHealthSort,
)
from feature_test_utils import FeatureProject
from job_test_utils import HeldJobs, unreachable_redis
from pipeline_test_utils import (
    all_steps,
    artefact_named,
    core_steps,
    failing_started_hook,
    read_step_status,
    started_steps,
)
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from repos.ray.ray_repo import RayRepo
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.job_system.job_system_enum import JobStatus
from systems.search_system.sorting import SortDirection
from text_steps_test_utils import TextStepsProject, spacy_output

from .conftest import RecomputeProject, RemovedStepProject

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
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
            [("es_index", SortDirection.ASC)],
            2,
            ["text_running.txt", "text_done.txt"],
            id="step-asc",
        ),
        pytest.param(
            [("es_index", SortDirection.DESC)],
            2,
            ["text_done.txt", "text_running.txt"],
            id="step-desc",
        ),
        # not planned for both, so the name decides
        pytest.param(
            [("keywords", SortDirection.DESC)],
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


def test_search_sdoc_health_ignores_the_row_of_an_unregistered_step(
    client: TestClient, removed_step_project: RemovedStepProject
):
    """The status row of "removed_step" belongs to no registered step: the
    health view shows the registered steps of the document only and answers as
    usual."""
    response = client.post(
        f"/docprocessing/project/{removed_step_project['project'].id}/search",
        params={"doctype": DocType.text.value, "page": 0, "page_size": 10},
        json=[],
    )

    assert response.status_code == 200, response.text
    (row,) = SdocHealthResult.model_validate(response.json()).data
    assert "removed_step" not in row.status
    assert row.status["text_extraction"] == 1


# ===========================================================================
# SEARCH COLUMNS (/docprocessing/searchColumns/{doctype}) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "doctype",
    [
        # html_extraction, then the text steps
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
    declarations of the jobs, in pipeline order; the core steps (those of a
    project without features, es_index among them) are flagged."""
    response = client.get(f"/docprocessing/searchColumns/{doctype.value}")

    assert response.status_code == 200, response.text
    columns = [SdocHealthColumn.model_validate(c) for c in response.json()]
    assert [c.step for c in columns] == all_steps(doctype)
    assert {c.step for c in columns if c.core} == set(core_steps(doctype))
    assert "es_index" in core_steps(doctype)


def test_search_columns_are_titled_by_the_artefacts_their_steps_produce(
    client: TestClient,
):
    """A column is titled by the titles of the artefacts its step produces, not
    by the step name: the step tokens_sentences shows "Tokens and sentences",
    es_index the title of the artefact es_index."""
    response = client.get(f"/docprocessing/searchColumns/{DocType.text.value}")

    assert response.status_code == 200, response.text
    titles = {
        c.step: c.title
        for c in (SdocHealthColumn.model_validate(c) for c in response.json())
    }
    assert titles["tokens_sentences"] == "Tokens and sentences"
    assert titles["es_index"] == artefact_named("es_index").title
    assert all(titles.values())


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
    response = _recompute(client, p["project"].id, "text_extraction", [sdoc_id])
    assert response.status_code == 200, response.text
    with failing_started_hook():
        held_jobs.run("text_extraction")
    assert read_step_status(db_session, sdoc_id, "text_extraction") == -100

    response = client.post(
        f"/docprocessing/project/{p['project'].id}/retry",
        params={"doctype": DocType.text.value},
        json=[sdoc_id],
    )

    assert response.status_code == 200, response.text
    assert response.json().startswith("Retried 1 / 1 jobs")
    held_jobs.run("text_extraction")
    (job,) = held_jobs.ran("text_extraction")
    assert job.get_status() == JobStatus.FINISHED
    assert read_step_status(db_session, sdoc_id, "text_extraction") == 1


# ===========================================================================
# RECOMPUTE (/docprocessing/project/{project_id}/recompute) TESTS
# ===========================================================================


def _recompute(client: TestClient, project_id: int, step: str, sdoc_ids: list[int]):
    return client.post(
        f"/docprocessing/project/{project_id}/recompute",
        params={"processing_step": step},
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

    response = _recompute(client, p["project"].id, "language_detection", [sdoc_id])

    assert response.status_code == 200, response.text
    assert response.json() == 1
    assert started_steps(held_jobs) == {sdoc_id: ["language_detection"]}


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
        "language_detection",
        [no_data, p["text_done"].id],
    )

    assert response.status_code == 200, response.text
    assert response.json() == 1
    assert started_steps(held_jobs) == {p["text_done"].id: ["language_detection"]}
    steps = [
        "text_extraction",
        "language_detection",
        "tokens_sentences",
        "html_mapping",
    ]
    assert [read_step_status(db_session, no_data, s) for s in steps] == [
        1,
        -100,
        -100,
        -100,
    ]


def test_recompute_of_text_ner_runs_that_step_only(
    client: TestClient,
    db_session,
    text_steps_project: TextStepsProject,
    held_jobs: HeldJobs,
):
    """Recomputing the named entities of text starts the job named_entity_recognition only;
    once it ran, nothing follows it, and tokens_sentences and the HTML mapping keep
    their status."""
    p = text_steps_project
    sdoc_id = p["text"].id

    response = _recompute(
        client, p["project"].id, "named_entity_recognition", [sdoc_id]
    )

    assert response.status_code == 200, response.text
    assert started_steps(held_jobs) == {sdoc_id: ["named_entity_recognition"]}
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(
            RayRepo,
            "spacy_pipline",
            lambda self, spacy_input: spacy_output(spacy_input.text, {}),
        )
        held_jobs.run("named_entity_recognition")
    assert [job_type for job_type, _ in held_jobs.jobs()] == []
    assert [
        read_step_status(db_session, sdoc_id, s)
        for s in ("named_entity_recognition", "tokens_sentences", "html_mapping")
    ] == [1, 1, 1]


def test_recompute_with_an_unreachable_queue_fails_the_step(
    client: TestClient,
    db_session,
    recompute_project: RecomputeProject,
    held_jobs: HeldJobs,
):
    """If the queue cannot be reached, the step cannot start: like any step
    that cannot start, it becomes erroneous, and the request starts no job (it answers 0)."""
    p = recompute_project
    sdoc_id = p["text_done"].id

    with unreachable_redis():
        response = _recompute(client, p["project"].id, "language_detection", [sdoc_id])

    assert response.status_code == 200, response.text
    assert response.json() == 0
    assert held_jobs.jobs() == []
    assert read_step_status(db_session, sdoc_id, "language_detection") == -100


def test_recompute_of_a_step_that_is_not_planned_is_rejected(
    client: TestClient,
    db_session,
    recompute_project: RecomputeProject,
    held_jobs: HeldJobs,
):
    """The keywords are not planned for text_done (the project enables no
    feature): Recompute never plans the step of a feature (its set up may not
    have run), so it answers 400 naming the step, starts no job and creates no
    status row."""
    p = recompute_project
    sdoc_id = p["text_done"].id

    response = _recompute(client, p["project"].id, "keywords", [sdoc_id])

    assert response.status_code == 400, response.text
    assert "keywords" in response.text
    assert held_jobs.jobs() == []
    assert read_step_status(db_session, sdoc_id, "keywords") is None


def test_recompute_plans_a_core_step_that_is_not_planned(
    client: TestClient,
    db_session,
    recompute_project: RecomputeProject,
    held_jobs: HeldJobs,
):
    """es_index of no_data has no status row (no_data was created without
    it). It is a core step, which no feature owns: Recompute plans it and
    starts its job, which cannot start for no_data (no content), so it becomes
    erroneous instead of staying unplanned."""
    p = recompute_project
    sdoc_id = p["no_data"].id
    assert read_step_status(db_session, sdoc_id, "es_index") is None

    response = _recompute(client, p["project"].id, "es_index", [sdoc_id])

    assert response.status_code == 200, response.text
    assert read_step_status(db_session, sdoc_id, "es_index") == -100
    assert held_jobs.jobs() == []


def test_recompute_is_rejected_as_a_whole_if_one_document_lacks_the_step(
    client: TestClient,
    db_session,
    recompute_project: RecomputeProject,
    held_jobs: HeldJobs,
):
    """The keywords are planned for keywords_done but not for text_done: a
    request that names both is rejected as a whole, names text_done only, and
    starts no job for keywords_done either."""
    p = recompute_project
    sdoc_ids = [p["keywords_done"].id, p["text_done"].id]

    response = _recompute(client, p["project"].id, "keywords", sdoc_ids)

    assert response.status_code == 400, response.text
    assert f"[{p['text_done'].id}]" in response.text
    assert held_jobs.jobs() == []
