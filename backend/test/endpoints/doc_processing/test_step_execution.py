from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.languages_enum import Language
from common.sdoc_status_enum import SDocStatus
from core.doc_processing.doc_processing_dto import SdocInitJobInput
from core.doc_processing.text.html_extraction_job import (
    ExtractHTMLJobInput,
    ExtractHTMLJobOutput,
)
from feature_test_utils import FeatureProject, feature_named
from job_test_utils import HeldJobs, unreachable_redis
from pipeline_test_utils import failing_started_hook, read_step_status, started_steps
from systems.artefact_system.artefact_dto import (
    ProcessingSettings,
    SdocProcessingJobInput,
)
from systems.artefact_system.source_document_step_status_crud import (
    crud_sdoc_step_status,
)
from systems.artefact_system.step_execution import (
    handle_job_error,
    handle_job_finished,
    start_steps,
)
from systems.feature_system.feature_service import FeatureService
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobStatus
from text_steps_test_utils import TextStepsProject

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


def _statuses(db_session, sdoc_id: int, steps: list[str]) -> list[int | None]:
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
        "text_language_detection",
        SdocProcessingJobInput(
            project_id=feature_project["project"].id,
            sdoc_id=sdoc_id,
            settings=SETTINGS,
        ),
    )

    steps = [
        "extract_html",
        "text_extraction",
        "text_language_detection",
        "text_spacy",
        "text_html_mapping",
        "text_sentence_embedding",
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
        steps=["text_language_detection"],
        settings=SETTINGS,
    )
    job = started["text_language_detection"]
    assert job is not None

    with failing_started_hook():
        held_jobs.run("text_language_detection")

    assert JobService().get_job(job.get_id()).get_status() == JobStatus.FAILED
    steps = [
        "text_language_detection",
        "text_spacy",
        "text_html_mapping",
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
    (extract_html,) = held_jobs.inputs("extract_html")
    assert isinstance(extract_html, SdocProcessingJobInput)
    sdoc_id = extract_html.sdoc_id

    with unreachable_redis():
        held_jobs.run("extract_html")

    (job,) = held_jobs.ran("extract_html")
    assert job.get_status() == JobStatus.FINISHED
    assert held_jobs.jobs() == []
    status = crud_sdoc_step_status.read_by_sdoc(db=db_session, sdoc_id=sdoc_id)
    assert status.pop("extract_html") == SDocStatus.finished
    assert "text_extraction" in status
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
        steps=["text_language_detection"],
        settings=SETTINGS,
    )

    held_jobs.abandon("text_language_detection")

    steps = [
        "text_language_detection",
        "text_spacy",
        "text_html_mapping",
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
    (extract_html,) = held_jobs.inputs("extract_html")
    assert isinstance(extract_html, ExtractHTMLJobInput)
    output = ExtractHTMLJobOutput(
        raw_html="<p>text</p>",
        image_paths=[dummy_step_projects["upload"]],
        folder_id=None,
    )

    with unreachable_redis():
        handle_job_finished("extract_html", extract_html, output)

    assert (
        read_step_status(db_session, extract_html.sdoc_id, "extract_html")
        == SDocStatus.finished
    )


def test_a_step_planned_while_text_spacy_runs_starts_after_the_language_detection(
    db_session,
    text_steps_project: TextStepsProject,
    held_jobs: HeldJobs,
):
    """Completing keyword statistics plans text_keywords for spacy_running,
    whose spaCy job runs: text_keywords follows the language detection, which
    is finished, so the computation starts it at once, and it finishes while
    text_spacy is still processing."""
    p = text_steps_project
    sdoc_id = p["spacy_running"].id

    FeatureService().complete_feature(
        db=db_session,
        project_id=p["project"].id,
        feature=feature_named("keyword_statistics"),
        settings=SETTINGS,
    )
    db_session.commit()
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)

    assert started_steps(held_jobs) == {sdoc_id: ["text_keywords"]}
    held_jobs.run("text_keywords")
    assert _statuses(db_session, sdoc_id, ["text_keywords", "text_spacy"]) == [
        SDocStatus.finished,
        SDocStatus.processing,
    ]
