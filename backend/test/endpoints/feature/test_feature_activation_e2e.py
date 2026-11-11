"""Feature activations that run the real worker: the feature activation job, the
step jobs it starts and the advancing to the steps after them (Ray included)."""

import time

import sqlalchemy as sa
from fastapi.testclient import TestClient

from common.feature_enum import Feature
from common.job_type_enum import JobType
from common.languages_enum import Language
from core.doc.source_document_orm import SDOC_STATUS_COLUMNS
from modules.doc_processing.doc_processing_dto import (
    ProcessingSettings,
    SdocProcessingJobInput,
)
from systems.feature_system.feature_dto import FeatureActivation
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobStatus

from .conftest import ActivationProject

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=3,
    keyword_number=7,
    keyword_deduplication_threshold=0.3,
    keyword_max_ngram_size=3,
    language=Language.english,
    model="default",
)


def _activate(client: TestClient, project_id: int, feature: Feature) -> None:
    response = client.put(
        f"/feature/project/{project_id}/{feature.value}",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text


def _wait_until_nothing_processes(
    db_session, project_id: int, timeout: float = 180.0
) -> None:
    """Wait until no step of the project's documents is processing."""
    any_processing = " OR ".join(f"{c} = 0" for c in SDOC_STATUS_COLUMNS)
    deadline = time.monotonic() + timeout
    while True:
        db_session.expire_all()
        processing = db_session.execute(
            sa.text(
                "SELECT count(*) FROM sourcedocument "
                f"WHERE project_id = :p AND ({any_processing})"
            ),
            {"p": project_id},
        ).scalar_one()
        db_session.commit()
        if processing == 0:
            return
        assert time.monotonic() < deadline, f"{processing} documents still process"
        time.sleep(1)


def _status(db_session, sdoc_id: int, step: JobType) -> int | None:
    db_session.expire_all()
    status = db_session.execute(
        sa.text(f"SELECT {step.value} FROM sourcedocument WHERE id = :id"),
        {"id": sdoc_id},
    ).scalar_one()
    db_session.commit()
    return status


def test_activate_full_text_search_indexes_the_documents_and_fails_those_without_data(
    client: TestClient,
    db_session,
    activation_project: ActivationProject,
):
    """The activation job starts the index of every document; the index of
    no_data cannot start, so it is erroneous, and the other documents are indexed
    anyway."""
    p = activation_project

    _activate(client, p["project"].id, Feature.FULL_TEXT_SEARCH)
    _wait_until_nothing_processes(db_session, p["project"].id)

    assert _status(db_session, p["tokenized"].id, JobType.TEXT_ES_INDEX) == 1
    assert _status(db_session, p["no_data"].id, JobType.TEXT_ES_INDEX) == -100


def test_activate_keyword_statistics_advances_through_the_planned_steps(
    client: TestClient,
    db_session,
    activation_project: ActivationProject,
):
    """For extracted, the activation starts the language detection only; when it
    finishes, the advancing starts spaCy for tokens and keywords, and then the
    HTML mapping. tokenized gets the keywords from a spaCy run for the keywords
    alone, which leaves its finished steps alone."""
    p = activation_project

    _activate(client, p["project"].id, Feature.KEYWORD_STATISTICS)
    _wait_until_nothing_processes(db_session, p["project"].id)

    for step in (
        JobType.TEXT_LANGUAGE_DETECTION,
        JobType.TEXT_SPACY,
        JobType.TEXT_HTML_MAPPING,
        JobType.TEXT_KEYWORDS,
    ):
        assert _status(db_session, p["extracted"].id, step) == 1, step
        assert _status(db_session, p["tokenized"].id, step) == 1, step
    assert _status(db_session, p["tokenized"].id, JobType.TEXT_NER) is None


def test_activate_word_frequency_runs_spacy_for_the_word_frequencies_only(
    client: TestClient,
    db_session,
    activation_project: ActivationProject,
):
    """The spaCy job of tokenized computes only the word frequencies: they are
    stored, and the steps after the tokens (the HTML mapping) are not recomputed
    (they stay finished, nothing processes)."""
    p = activation_project

    _activate(client, p["project"].id, Feature.WORD_FREQUENCY)
    _wait_until_nothing_processes(db_session, p["project"].id)

    sdoc_id = p["tokenized"].id
    assert _status(db_session, sdoc_id, JobType.TEXT_WORD_FREQUENCY) == 1
    words = db_session.execute(
        sa.text("SELECT word FROM wordfrequency WHERE sdoc_id = :id"),
        {"id": sdoc_id},
    ).scalars()
    assert {"cat", "mat"} <= set(words)
    assert _status(db_session, sdoc_id, JobType.TEXT_HTML_MAPPING) == 1


def test_step_job_of_a_step_that_is_not_planned_is_skipped(
    db_session,
    activation_project: ActivationProject,
):
    """A step job whose steps are not planned for the document (the index of
    tokenized, no feature needs it) is skipped by the worker: it finishes without
    computing anything, and the step stays not planned."""
    p = activation_project
    js = JobService()

    job = js.start_job(
        JobType.TEXT_ES_INDEX,
        SdocProcessingJobInput(
            project_id=p["project"].id,
            sdoc_id=p["tokenized"].id,
            settings=SETTINGS,
            steps=None,
        ),
    )

    deadline = time.monotonic() + 60
    while job.get_status() not in (JobStatus.FINISHED, JobStatus.FAILED):
        assert time.monotonic() < deadline, "the job did not end"
        time.sleep(0.5)
        job = js.get_job(job.get_id())
    assert job.get_status() == JobStatus.FINISHED
    assert job.job.meta["status_message"].startswith("Skipped")
    assert _status(db_session, p["tokenized"].id, JobType.TEXT_ES_INDEX) is None
