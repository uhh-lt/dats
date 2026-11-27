import json

import pytest
from fastapi.testclient import TestClient

from common.doc_type_enum import DocType
from common.languages_enum import Language
from config import conf
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_file_crud import crud_sdoc_file
from core.doc_processing.doc_processing_dto import (
    SdocHealthColumn,
    SdocHealthResult,
    SdocHealthSort,
    SdocInitJobInput,
)
from core.doc_processing.entrypoints.doc_chunking_job import DocChunkingJobInput
from core.project.project_orm import ProjectORM
from dats_test_utils import ProjectWithSdoc
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
from repos.filesystem.filesystem_repo import FilesystemRepo
from repos.filesystem.temporary_file_crud import crud_temporary_file
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

# Front matter, then five pages with the markers <!-- page 1 --> to <!-- page 5 -->.
MARKED_HTML = (
    "<html><body><h1>Front matter</h1>"
    "<!-- page 1 --><p>Page one</p>"
    "<!-- page 2 --><p>Page two</p>"
    "<!-- Page 3 --><p>Page three</p>"
    "<!--page 4--><p>Page four</p>"
    "<!-- page 5 --><p>Page five</p>"
    "</body></html>"
)

# Three pages with the markers <!-- page 9 --> to <!-- page 11 -->.
LATE_MARKED_HTML = (
    "<html><body>"
    "<!-- page 9 --><p>Page nine</p>"
    "<!-- page 10 --><p>Page ten</p>"
    "<!-- page 11 --><p>Page eleven</p>"
    "</body></html>"
)

# Two pages with markers in an html and body tag with attributes, as Mistral OCR
# output converted by a partner (the class tells DATS to skip readability).
ATTRIBUTED_MARKED_HTML = (
    '<html class="readability-watermark"><body class="journal">'
    "<!-- page 1 --><p>Page one</p>"
    "<!-- page 2 --><p>Page two</p>"
    "</body></html>"
)

# Three paragraphs without markers that fit one page each but not two together,
# in an html and body tag with attributes.
ATTRIBUTED_LONG_HTML = (
    '<html class="readability-watermark"><body class="journal">'
    + f"<p>{'x' * (conf.chunking.characters_per_page - 100)}</p>" * 3
    + "</body></html>"
)

# The markers of two pages inside a div, not among the top-level elements.
NESTED_MARKED_HTML = (
    "<html><body><div>"
    "<!-- page 1 --><p>Page one</p>"
    "<!-- page 2 --><p>Page two</p>"
    "</div></body></html>"
)

# ===========================================================================
# UPLOAD (/projects/{project_id}/doc-processing/upload) TESTS
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
        f"/projects/{test_project.id}/doc-processing/upload",
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
        f"/projects/{test_project.id}/doc-processing/upload",
        data={"settings": SETTINGS_JSON},
        files=[supported, unsupported],
    )
    assert response.status_code == 406, response.text

    # 2. no file and no source document remain
    assert list(FilesystemRepo().root_dir.rglob("supported.txt")) == []
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
        f"/projects/{test_project.id}/doc-processing/upload",
        data={"settings": SETTINGS_JSON},
        files=[supported],
    )
    assert response.status_code == 200, response.text
    assert response.json() == 1


def test_upload_of_an_existing_filename_fails_and_stages_nothing(
    client: TestClient, project_with_sdoc: ProjectWithSdoc
):
    """A file named like a document of the project is rejected with 409 before
    anything is staged."""
    project = project_with_sdoc["project"]
    filename = project_with_sdoc["source_document"].filename

    response = client.post(
        f"/projects/{project.id}/doc-processing/upload",
        data={"settings": SETTINGS_JSON},
        files=[("uploaded_files", (filename, b"again", "text/plain"))],
    )

    assert response.status_code == 409, response.text
    assert filename in response.text
    temporary_files = FilesystemRepo().root_dir / "temporary_files"
    assert list(temporary_files.rglob(filename)) == []


def test_upload_moves_the_staged_file_into_the_folder_of_its_document(
    client: TestClient, test_project, held_jobs: HeldJobs
):
    """The upload is staged in a temporary folder; sdoc_init moves it into the
    folder of the new document and removes the empty staging folder."""
    response = client.post(
        f"/projects/{test_project.id}/doc-processing/upload",
        data={"settings": SETTINGS_JSON},
        files=[("uploaded_files", ("note.txt", b"hello world", "text/plain"))],
    )
    assert response.status_code == 200, response.text
    (chunking,) = held_jobs.inputs("doc_chunking")
    assert isinstance(chunking, DocChunkingJobInput)
    staging = crud_temporary_file.dir(id=chunking.temporary_file_id)
    assert [p.name for p in staging.iterdir()] == ["note.txt"]

    held_jobs.run("doc_chunking", "sdoc_init")

    with SQLRepo().transaction() as db:
        sdoc = crud_sdoc.read_by_filename(
            db=db, project_id=test_project.id, filename="note.txt", only_finished=False
        )
        assert sdoc is not None
        sdoc_id = sdoc.id
    path = crud_sdoc_file.path(project_id=test_project.id, id=sdoc_id, name="note.txt")
    assert path.read_bytes() == b"hello world"
    assert not staging.exists()


# --- HTML chunking ----------------------------------------------------------
# An uploaded HTML file is split into chunks by the doc_chunking job: at its
# page markers (`<!-- page N -->` among the top-level elements of the body),
# pages_per_chunk pages per chunk, or by characters if it has none. Each chunk
# becomes a document of one folder (an sdoc_init job with the chunk's file).


def _upload_html_and_chunk(
    client: TestClient,
    held_jobs: HeldJobs,
    project_id: int,
    filename: str,
    html: str,
    pages_per_chunk: int,
) -> list[SdocInitJobInput]:
    """Upload the HTML file, run its doc_chunking job and return the inputs of
    the sdoc_init jobs it started, in the order of the chunks."""
    settings = SETTINGS.model_copy(update={"pages_per_chunk": pages_per_chunk})
    response = client.post(
        f"/projects/{project_id}/doc-processing/upload",
        data={"settings": settings.model_dump_json()},
        files=[("uploaded_files", (filename, html.encode("utf-8"), "text/html"))],
    )
    assert response.status_code == 200, response.text
    assert response.json() == 1

    held_jobs.run("doc_chunking")
    inputs = [job_input for _, job_input in held_jobs.jobs("sdoc_init")]
    assert all(isinstance(job_input, SdocInitJobInput) for job_input in inputs)
    return sorted(
        [job_input for job_input in inputs if isinstance(job_input, SdocInitJobInput)],
        key=lambda job_input: job_input.filename,
    )


@pytest.mark.parametrize(
    "pages_per_chunk,expected_filenames",
    [
        # Two pages per chunk -> the fifth page is a chunk of its own.
        pytest.param(
            2,
            ["book_pages_1-2.html", "book_pages_3-4.html", "book_pages_5-5.html"],
            id="two-pages-per-chunk",
        ),
        # One page per chunk -> one chunk per marker.
        pytest.param(
            1,
            [f"book_pages_{n}-{n}.html" for n in range(1, 6)],
            id="one-page-per-chunk",
        ),
        # Four pages per chunk -> one full and one partial chunk.
        pytest.param(
            4,
            ["book_pages_1-4.html", "book_pages_5-5.html"],
            id="four-pages-per-chunk",
        ),
    ],
)
def test_upload_of_html_with_page_markers_chunks_it_at_the_markers(
    client: TestClient,
    test_project,
    held_jobs: HeldJobs,
    pages_per_chunk: int,
    expected_filenames: list[str],
):
    """An HTML file with five page markers is split into chunks of
    pages_per_chunk pages, named after their page range, all in one folder."""
    inputs = _upload_html_and_chunk(
        client, held_jobs, test_project.id, "book.html", MARKED_HTML, pages_per_chunk
    )

    assert [job_input.filename for job_input in inputs] == expected_filenames
    folder_ids = {job_input.folder_id for job_input in inputs}
    assert len(folder_ids) == 1 and None not in folder_ids


def test_upload_of_html_with_page_markers_keeps_the_content_of_each_page(
    client: TestClient, test_project, held_jobs: HeldJobs
):
    """Each chunk holds the content of its pages; the content before the first
    marker belongs to the first page."""
    inputs = _upload_html_and_chunk(
        client, held_jobs, test_project.id, "book.html", MARKED_HTML, 2
    )

    contents = [
        crud_temporary_file.path(
            id=job_input.temporary_file_id, name=job_input.filename
        ).read_text(encoding="utf-8")
        for job_input in inputs
    ]
    expected = [
        ["Front matter", "Page one", "Page two"],
        ["Page three", "Page four"],
        ["Page five"],
    ]
    all_texts = {text for texts in expected for text in texts}
    for content, texts in zip(contents, expected, strict=True):
        assert {text for text in all_texts if text in content} == set(texts)


def test_upload_of_html_with_page_markers_names_the_chunks_by_the_marker_numbers(
    client: TestClient, test_project, held_jobs: HeldJobs
):
    """The page numbers in the chunk names are those of the markers (pages 9 to
    11), zero-padded to the digits of the highest page."""
    inputs = _upload_html_and_chunk(
        client, held_jobs, test_project.id, "journal.html", LATE_MARKED_HTML, 2
    )

    assert [job_input.filename for job_input in inputs] == [
        "journal_pages_09-10.html",
        "journal_pages_11-11.html",
    ]


@pytest.mark.parametrize(
    "html",
    [
        # Five pages fit into one chunk of ten pages.
        pytest.param(MARKED_HTML, id="fewer-pages-than-pages-per-chunk"),
        # Markers inside a div are no page markers, and the file is short.
        pytest.param(NESTED_MARKED_HTML, id="nested-markers"),
    ],
)
def test_upload_of_short_html_keeps_the_file_whole(
    client: TestClient, test_project, held_jobs: HeldJobs, html: str
):
    """An HTML file that needs no split becomes one document of its own file,
    without a chunk folder."""
    inputs = _upload_html_and_chunk(
        client, held_jobs, test_project.id, "book.html", html, 10
    )

    assert [(i.filename, i.folder_id) for i in inputs] == [("book.html", None)]


@pytest.mark.parametrize(
    "html,expected_chunks",
    [
        # Split at the two page markers, one page per chunk.
        pytest.param(ATTRIBUTED_MARKED_HTML, 2, id="page-markers"),
        # Split by characters into three one-page chunks.
        pytest.param(ATTRIBUTED_LONG_HTML, 3, id="characters"),
    ],
)
def test_upload_of_html_keeps_the_attributes_of_html_and_body_in_each_chunk(
    client: TestClient,
    test_project,
    held_jobs: HeldJobs,
    html: str,
    expected_chunks: int,
):
    """Every chunk keeps the attributes of the html and body tag, so a
    readability watermark of the uploaded file still applies to its chunks."""
    inputs = _upload_html_and_chunk(
        client, held_jobs, test_project.id, "issue.html", html, 1
    )

    assert len(inputs) == expected_chunks
    for job_input in inputs:
        content = crud_temporary_file.path(
            id=job_input.temporary_file_id, name=job_input.filename
        ).read_text(encoding="utf-8")
        assert '<html class="readability-watermark">' in content
        assert '<body class="journal">' in content


def test_upload_of_html_without_page_markers_chunks_it_by_characters(
    client: TestClient, test_project, held_jobs: HeldJobs
):
    """Without page markers, an HTML file longer than characters_per_page *
    pages_per_chunk is split at element boundaries: three paragraphs that fit
    one page each but not two together become three one-page chunks."""
    paragraph = f"<p>{'x' * (conf.chunking.characters_per_page - 100)}</p>"
    html = f"<html><body>{paragraph * 3}</body></html>"

    inputs = _upload_html_and_chunk(
        client, held_jobs, test_project.id, "long.html", html, 1
    )

    assert [job_input.filename for job_input in inputs] == [
        "long_pages_1-1.html",
        "long_pages_2-2.html",
        "long_pages_3-3.html",
    ]


# ===========================================================================
# SEARCH STATUSES (/projects/{project_id}/doc-processing/statuses) TESTS
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
def test_search_statuses_sorts_by_the_status_of_a_step_or_a_column(
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
        f"/projects/{feature_project['project'].id}/doc-processing/statuses",
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


def test_search_statuses_ignores_the_row_of_an_unregistered_step(
    client: TestClient, removed_step_project: RemovedStepProject
):
    """The status row of "removed_step" belongs to no registered step: the
    health view shows the registered steps of the document only and answers as
    usual."""
    response = client.post(
        f"/projects/{removed_step_project['project'].id}/doc-processing/statuses",
        params={"doctype": DocType.text.value, "page": 0, "page_size": 10},
        json=[],
    )

    assert response.status_code == 200, response.text
    (row,) = SdocHealthResult.model_validate(response.json()).data
    assert "removed_step" not in row.status
    assert row.status["text_extraction"] == 1


# ===========================================================================
# SEARCH COLUMNS (/projects/{project_id}/doc-processing/columns) TESTS
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
    client: TestClient, test_project: ProjectORM, doctype: DocType
):
    """The steps per doctype are derived from the requires/produces/doctypes
    declarations of the jobs, in pipeline order; the core steps (those of a
    project without features, es_index among them) are flagged."""
    response = client.get(
        f"/projects/{test_project.id}/doc-processing/columns",
        params={"doctype": doctype.value},
    )

    assert response.status_code == 200, response.text
    columns = [SdocHealthColumn.model_validate(c) for c in response.json()]
    assert [c.step for c in columns] == all_steps(doctype)
    assert {c.step for c in columns if c.core} == set(core_steps(doctype))
    assert "es_index" in core_steps(doctype)


def test_search_columns_are_titled_by_the_artefacts_their_steps_produce(
    client: TestClient, test_project: ProjectORM
):
    """A column is titled by the titles of the artefacts its step produces, not
    by the step name: the step tokens_sentences shows "Tokens and sentences",
    es_index the title of the artefact es_index."""
    response = client.get(
        f"/projects/{test_project.id}/doc-processing/columns",
        params={"doctype": DocType.text.value},
    )

    assert response.status_code == 200, response.text
    titles = {
        c.step: c.title
        for c in (SdocHealthColumn.model_validate(c) for c in response.json())
    }
    assert titles["tokens_sentences"] == "Tokens and sentences"
    assert titles["es_index"] == artefact_named("es_index").title
    assert all(titles.values())


# ===========================================================================
# RETRY (/projects/{project_id}/doc-processing/retry) TESTS
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
        f"/projects/{p['project'].id}/doc-processing/retry",
        params={"doctype": DocType.text.value},
        json=[sdoc_id],
    )

    assert response.status_code == 200, response.text
    assert response.json().startswith("Retried 1 / 1 jobs")
    held_jobs.run("text_extraction")
    (job,) = held_jobs.ran("text_extraction")
    assert job.get_status() == JobStatus.FINISHED
    assert read_step_status(db_session, sdoc_id, "text_extraction") == 1


def test_retry_of_a_document_of_another_project_retries_nothing(
    client: TestClient,
    db_session,
    test_project: ProjectORM,
    recompute_project: RecomputeProject,
    held_jobs: HeldJobs,
):
    """The failed text extraction of text_done (as above) is a job of "Recompute
    Project": retrying the document from the test project, another project of
    the user, matches no failed job and leaves the step erroneous."""
    p = recompute_project
    sdoc_id = p["text_done"].id
    response = _recompute(client, p["project"].id, "text_extraction", [sdoc_id])
    assert response.status_code == 200, response.text
    with failing_started_hook():
        held_jobs.run("text_extraction")

    response = client.post(
        f"/projects/{test_project.id}/doc-processing/retry",
        params={"doctype": DocType.text.value},
        json=[sdoc_id],
    )

    assert response.status_code == 200, response.text
    assert response.json().startswith("Retried 0 / 0 jobs")
    held_jobs.run("text_extraction")
    assert len(held_jobs.ran("text_extraction")) == 1
    assert read_step_status(db_session, sdoc_id, "text_extraction") == -100


# ===========================================================================
# RECOMPUTE (/projects/{project_id}/doc-processing/recompute) TESTS
# ===========================================================================


def _recompute(client: TestClient, project_id: int, step: str, sdoc_ids: list[int]):
    return client.post(
        f"/projects/{project_id}/doc-processing/recompute",
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


def test_recompute_of_a_document_of_another_project_is_not_found(
    client: TestClient,
    test_project: ProjectORM,
    recompute_project: RecomputeProject,
    held_jobs: HeldJobs,
):
    """Recomputing text_done of "Recompute Project" from the test project, another
    project of the user, answers 404 and starts nothing."""
    sdoc_id = recompute_project["text_done"].id

    response = _recompute(client, test_project.id, "language_detection", [sdoc_id])

    assert response.status_code == 404, response.text
    assert started_steps(held_jobs) == {}


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
