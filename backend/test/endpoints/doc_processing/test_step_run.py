import pytest

from common.job_type_enum import JobType
from common.languages_enum import Language
from common.sdoc_status_enum import SDocStatus
from feature_test_utils import FeatureProject
from job_test_utils import HeldJobs
from modules.doc_processing import step_run
from modules.doc_processing.doc_processing_dto import (
    ProcessingSettings,
    SdocProcessingJobInput,
)
from modules.doc_processing.step_run import (
    handle_job_error,
    handle_job_started,
    start_steps,
)
from pipeline_test_utils import read_step_status
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobStatus

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


def test_a_failed_job_leaves_its_steps_that_are_not_planned_unplanned(
    db_session, feature_project: FeatureProject
):
    """A spaCy job of text_running for tokens and keywords fails after the
    keywords were unplanned (their feature was disabled while it ran): tokens
    become erroneous, the keywords stay not planned."""
    sdoc_id = feature_project["text_running"].id

    handle_job_error(
        JobType.TEXT_SPACY,
        SdocProcessingJobInput(
            project_id=feature_project["project"].id,
            sdoc_id=sdoc_id,
            settings=SETTINGS,
            steps=[JobType.TEXT_SPACY, JobType.TEXT_KEYWORDS],
        ),
    )

    steps = [JobType.TEXT_SPACY, JobType.TEXT_KEYWORDS]
    assert _statuses(db_session, sdoc_id, steps) == [-100, None]


def test_a_job_whose_steps_are_not_planned_is_skipped(
    db_session, feature_project: FeatureProject
):
    """A queued sentence embedding job of text_done, whose step is not planned
    (its feature was disabled while the job waited), is skipped and does not
    set the step to processing."""
    sdoc_id = feature_project["text_done"].id

    run_input = handle_job_started(
        JobType.TEXT_SENTENCE_EMBEDDING,
        SdocProcessingJobInput(
            project_id=feature_project["project"].id,
            sdoc_id=sdoc_id,
            settings=SETTINGS,
        ),
    )

    assert run_input is None
    assert _statuses(db_session, sdoc_id, [JobType.TEXT_SENTENCE_EMBEDDING]) == [None]


def test_a_job_drops_its_steps_that_are_not_planned(
    db_session, feature_project: FeatureProject
):
    """A recompute of tokens and keywords of text_done, where the keywords are not
    planned, runs for the tokens only: the input to run is a copy narrowed to the
    tokens, the stored input keeps both steps, and the keywords stay not
    planned."""
    sdoc_id = feature_project["text_done"].id
    payload = SdocProcessingJobInput(
        project_id=feature_project["project"].id,
        sdoc_id=sdoc_id,
        settings=SETTINGS,
        steps=[JobType.TEXT_SPACY, JobType.TEXT_KEYWORDS],
    )

    run_input = handle_job_started(JobType.TEXT_SPACY, payload)

    assert isinstance(run_input, SdocProcessingJobInput)
    assert run_input.steps == [JobType.TEXT_SPACY]
    assert payload.steps == [JobType.TEXT_SPACY, JobType.TEXT_KEYWORDS]
    steps = [JobType.TEXT_SPACY, JobType.TEXT_KEYWORDS]
    assert _statuses(db_session, sdoc_id, steps) == [0, None]


_set_status = step_run._set_status


def _fail_to_set_processing(
    job_type: JobType,
    input: JobInputBase,
    status: SDocStatus,
    steps: list[JobType] | None = None,
) -> None:
    """Set the status of the steps of a run, but fail to set them processing,
    as if the database failed in the started hook."""
    if status == SDocStatus.processing:
        raise RuntimeError("cannot set the steps processing")
    _set_status(job_type, input, status, steps)


def test_a_job_whose_started_hook_fails_fails_its_steps(
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
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
        raise_on_failure=True,
    )
    job = started[JobType.TEXT_LANGUAGE_DETECTION]
    assert job is not None
    monkeypatch.setattr(step_run, "_set_status", _fail_to_set_processing)

    held_jobs.run(JobType.TEXT_LANGUAGE_DETECTION)

    assert JobService().get_job(job.get_id()).get_status() == JobStatus.FAILED
    steps = [
        JobType.TEXT_LANGUAGE_DETECTION,
        JobType.TEXT_SPACY,
        JobType.TEXT_HTML_MAPPING,
    ]
    assert _statuses(db_session, sdoc_id, steps) == [-100, -100, -100]
