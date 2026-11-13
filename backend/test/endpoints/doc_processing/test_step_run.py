from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.languages_enum import Language
from common.sdoc_status_enum import SDocStatus
from feature_test_utils import FeatureProject
from job_test_utils import HeldJobs, unreachable_redis
from modules.doc_processing.doc_processing_dto import SdocInitJobInput
from modules.doc_processing.text.html_extraction_job import (
    ExtractHTMLJobInput,
    ExtractHTMLJobOutput,
)
from pipeline_test_utils import failing_started_hook, read_step_status
from systems.artefact_system.artefact_dto import (
    ProcessingSettings,
    SdocProcessingJobInput,
)
from systems.artefact_system.source_document_step_status_crud import (
    crud_sdoc_step_status,
)
from systems.artefact_system.step_run import (
    handle_job_error,
    handle_job_finished,
    start_steps,
)
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobStatus

from .conftest import DummyStepProjects

SETTINGS = ProcessingSettings(
    extract_images=True,
    pages_per_chunk=10,
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
    language=Language.auto,
    model="default",
)


def _statuses(db_session, sdoc_id: int, steps: list[JobType]) -> list[int | None]:
    return [read_step_status(db_session, sdoc_id, s) for s in steps]


def test_a_failed_step_fails_the_pending_steps_after_it(
    db_session, feature_project: FeatureProject
):
    """When the language detection of text_running fails, spaCy and the HTML
    mapping after it are processing: they become erroneous instead of waiting
    forever. The finished steps before it and the not planned steps keep their
    status."""
    sdoc_id = feature_project["text_running"].id

    handle_job_error(
        JobType.TEXT_LANGUAGE_DETECTION,
        SdocProcessingJobInput(
            project_id=feature_project["project"].id,
            sdoc_id=sdoc_id,
            settings=SETTINGS,
        ),
    )

    steps = [
        JobType.EXTRACT_HTML,
        JobType.TEXT_EXTRACTION,
        JobType.TEXT_LANGUAGE_DETECTION,
        JobType.TEXT_SPACY,
        JobType.TEXT_HTML_MAPPING,
        JobType.TEXT_SENTENCE_EMBEDDING,
    ]
    assert _statuses(db_session, sdoc_id, steps) == [1, 1, -100, -100, -100, None]


def test_a_job_whose_started_hook_fails_fails_its_steps(
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """A language detection job of text_running whose started hook raises fails:
    its step and the pending steps after it (spaCy and the HTML mapping) become
    erroneous, like after any failed job, instead of staying processing."""
    sdoc_id = feature_project["text_running"].id
    started = start_steps(
        project_id=feature_project["project"].id,
        sdoc_id=sdoc_id,
        steps=[JobType.TEXT_LANGUAGE_DETECTION],
        settings=SETTINGS,
    )
    job = started[JobType.TEXT_LANGUAGE_DETECTION]
    assert job is not None

    with failing_started_hook():
        held_jobs.run(JobType.TEXT_LANGUAGE_DETECTION)

    assert JobService().get_job(job.get_id()).get_status() == JobStatus.FAILED
    steps = [
        JobType.TEXT_LANGUAGE_DETECTION,
        JobType.TEXT_SPACY,
        JobType.TEXT_HTML_MAPPING,
    ]
    assert _statuses(db_session, sdoc_id, steps) == [-100, -100, -100]


def test_a_finished_job_fails_its_successors_if_the_queue_is_unreachable(
    db_session,
    dummy_step_projects: DummyStepProjects,
    held_jobs: HeldJobs,
):
    """The upload of `dummy_step_projects` runs up to extract_html, which
    finishes while the queue cannot be reached: the job and its step are
    finished, and the steps after it cannot start, so they are erroneous
    instead of processing without a job."""
    JobService().start_job(
        JobType.SDOC_INIT,
        SdocInitJobInput(
            project_id=dummy_step_projects["project"].id,
            filepath=dummy_step_projects["upload"],
            doctype=DocType.text,
            folder_id=None,
            settings=SETTINGS,
        ),
    )
    held_jobs.run(JobType.SDOC_INIT)
    (extract_html,) = held_jobs.inputs(JobType.EXTRACT_HTML)
    assert isinstance(extract_html, SdocProcessingJobInput)
    sdoc_id = extract_html.sdoc_id

    with unreachable_redis():
        held_jobs.run(JobType.EXTRACT_HTML)

    (job,) = held_jobs.ran(JobType.EXTRACT_HTML)
    assert job.get_status() == JobStatus.FINISHED
    assert held_jobs.jobs() == []
    status = crud_sdoc_step_status.read_by_sdoc(db=db_session, sdoc_id=sdoc_id)
    assert status.pop(JobType.EXTRACT_HTML) == SDocStatus.finished
    assert JobType.TEXT_EXTRACTION in status
    assert set(status.values()) == {SDocStatus.erroneous}


def test_a_step_job_whose_worker_dies_fails_its_steps(
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """The worker running the language detection of text_running dies: RQ's
    cleanup of the started jobs fails the job and runs its failure callback,
    so the step and the pending steps after it (spaCy and the HTML mapping)
    become erroneous, like after any failed job."""
    sdoc_id = feature_project["text_running"].id
    start_steps(
        project_id=feature_project["project"].id,
        sdoc_id=sdoc_id,
        steps=[JobType.TEXT_LANGUAGE_DETECTION],
        settings=SETTINGS,
    )

    held_jobs.abandon(JobType.TEXT_LANGUAGE_DETECTION)

    steps = [
        JobType.TEXT_LANGUAGE_DETECTION,
        JobType.TEXT_SPACY,
        JobType.TEXT_HTML_MAPPING,
    ]
    assert _statuses(db_session, sdoc_id, steps) == [-100, -100, -100]


def test_a_finished_step_stays_finished_if_the_queue_is_unreachable_for_its_entry_points(
    db_session,
    dummy_step_projects: DummyStepProjects,
    held_jobs: HeldJobs,
):
    """extract_html of the upload of `dummy_step_projects` finishes with an
    extracted image while the queue cannot be reached: starting the image's
    sdoc_init fails, which is only logged, and the step stays finished."""
    JobService().start_job(
        JobType.SDOC_INIT,
        SdocInitJobInput(
            project_id=dummy_step_projects["project"].id,
            filepath=dummy_step_projects["upload"],
            doctype=DocType.text,
            folder_id=None,
            settings=SETTINGS,
        ),
    )
    held_jobs.run(JobType.SDOC_INIT)
    (extract_html,) = held_jobs.inputs(JobType.EXTRACT_HTML)
    assert isinstance(extract_html, ExtractHTMLJobInput)
    output = ExtractHTMLJobOutput(
        raw_html="<p>text</p>",
        image_paths=[dummy_step_projects["upload"]],
        folder_id=None,
    )

    with unreachable_redis():
        handle_job_finished(JobType.EXTRACT_HTML, extract_html, output)

    assert (
        read_step_status(db_session, extract_html.sdoc_id, JobType.EXTRACT_HTML)
        == SDocStatus.finished
    )
