"""Feature computations that run the real worker: the artefact computation job, the
step jobs it starts and the advancing to the steps after them (Ray included)."""

import time

import sqlalchemy as sa
from fastapi.testclient import TestClient

from common.languages_enum import Language
from core.project.project_crud import crud_project
from pipeline_test_utils import count_processing_sdocs, read_step_status
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.feature_system.feature_dto import FeatureActivation

from .conftest import ActivationProject

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=3,
    language=Language.english,
    model="default",
)


def _activate(client: TestClient, project_id: int, feature: str) -> None:
    response = client.post(
        f"/feature/project/{project_id}/{feature}/enable",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text


def _wait_until_nothing_processes(
    db_session, project_id: int, timeout: float = 180.0
) -> None:
    """Wait until the project has no pending artefact computation (its job has
    planned all documents) and no step of its documents is processing."""
    deadline = time.monotonic() + timeout
    while True:
        db_session.expire_all()
        pending = crud_project.read(db=db_session, id=project_id).artefact_computations
        db_session.commit()
        processing = count_processing_sdocs(db_session, project_id)
        if not pending and processing == 0:
            return
        assert time.monotonic() < deadline, (
            f"pending computations {pending}, {processing} documents still process"
        )
        time.sleep(1)


def test_activate_keyword_statistics_extracts_the_keywords_of_the_documents_and_fails_those_without_data(
    client: TestClient,
    db_session,
    activation_project: ActivationProject,
):
    """The computation job starts the index of every document; the index of
    no_data cannot start, so it is erroneous, and the other documents are indexed
    anyway."""
    p = activation_project

    _activate(client, p["project"].id, "keyword_statistics")
    _wait_until_nothing_processes(db_session, p["project"].id)

    assert read_step_status(db_session, p["tokenized"].id, "keywords") == 1
    assert read_step_status(db_session, p["no_data"].id, "keywords") == -100


def test_activate_keyword_statistics_advances_through_the_planned_steps(
    client: TestClient,
    db_session,
    activation_project: ActivationProject,
):
    """For extracted, the computation starts the language detection only; when it
    finishes, the advancing starts the jobs tokens_sentences and keywords, and
    after tokens_sentences the HTML mapping. tokenized gets the keywords from the
    keywords job alone, which leaves its finished steps alone."""
    p = activation_project

    _activate(client, p["project"].id, "keyword_statistics")
    _wait_until_nothing_processes(db_session, p["project"].id)

    for step in (
        "language_detection",
        "tokens_sentences",
        "html_mapping",
        "keywords",
    ):
        assert read_step_status(db_session, p["extracted"].id, step) == 1, step
        assert read_step_status(db_session, p["tokenized"].id, step) == 1, step
    assert (
        read_step_status(db_session, p["tokenized"].id, "named_entity_recognition")
        is None
    )


def test_activate_word_frequency_runs_the_word_frequency_job_only(
    client: TestClient,
    db_session,
    activation_project: ActivationProject,
):
    """The word_frequency job of tokenized stores the word frequencies,
    and the steps after the tokens (the HTML mapping) are not recomputed (they
    stay finished, nothing processes)."""
    p = activation_project

    _activate(client, p["project"].id, "word_frequency")
    _wait_until_nothing_processes(db_session, p["project"].id)

    sdoc_id = p["tokenized"].id
    assert read_step_status(db_session, sdoc_id, "word_frequency") == 1
    words = db_session.execute(
        sa.text("SELECT word FROM wordfrequency WHERE sdoc_id = :id"),
        {"id": sdoc_id},
    ).scalars()
    assert {"cat", "mat"} <= set(words)
    assert read_step_status(db_session, sdoc_id, "html_mapping") == 1
