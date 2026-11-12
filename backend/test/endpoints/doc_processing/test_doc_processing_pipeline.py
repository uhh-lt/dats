from common.job_type_enum import JobType
from common.languages_enum import Language
from feature_test_utils import FeatureProject
from modules.doc_processing.doc_processing_dto import (
    ProcessingSettings,
    SdocProcessingJobInput,
)
from modules.doc_processing.doc_processing_pipeline import (
    handle_job_error,
    handle_job_started,
)
from pipeline_test_utils import read_step_status

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
