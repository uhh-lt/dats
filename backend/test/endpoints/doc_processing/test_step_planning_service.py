import threading
from typing import Any

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from common.languages_enum import Language
from core.annotation.annotation_document_crud import crud_adoc
from core.project.project_crud import crud_project
from core.user.user_orm import UserORM
from job_test_utils import HeldJobs
from modules.doc_processing import step_planning_service
from modules.doc_processing.doc_processing_dto import (
    FeatureActivationJobInput,
    ProcessingSettings,
)
from modules.doc_processing.step_planning_service import StepPlanningService
from modules.doc_processing.step_run import start_steps
from pipeline_test_utils import (
    plan_activations,
    read_all_step_status,
    read_step_status,
    started_steps,
)
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_service import JobService

from .conftest import PlanningProjects

# The planning operations at the interface of StepPlanningService, for what the
# feature endpoint tests (`endpoints/project_features`) cannot see: other
# projects and doctypes, a chain of blocked steps, the document locks, the
# features an import adds and the planning of a new document.

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
    language=Language.english,
    model="default",
)


def _activation(held_jobs: HeldJobs) -> FeatureActivationJobInput:
    """The input of the one held feature activation job."""
    (activation,) = held_jobs.inputs(JobType.FEATURE_ACTIVATION)
    assert isinstance(activation, FeatureActivationJobInput)
    return activation


def _enable_full_text_search(db: Session, project_id: int) -> None:
    StepPlanningService().enable_feature(
        db=db,
        project_id=project_id,
        feature=Feature.FULL_TEXT_SEARCH,
        settings=SETTINGS,
    )
    db.commit()


# ===========================================================================
# ENABLE FEATURE
# ===========================================================================


def test_enable_feature_plans_only_the_documents_of_the_project(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
):
    """Enabling full-text search in project plans the index of its two text
    documents and starts it where its input is finished; the finished steps of
    done keep their status, and the image and the documents of the other
    project are left alone."""
    p = planning_projects

    _enable_full_text_search(db_session, p["project"].id)
    started = plan_activations(held_jobs)

    assert crud_project.read(db=db_session, id=p["project"].id).enabled_features == [
        Feature.FULL_TEXT_SEARCH
    ]
    assert read_all_step_status(db_session, p["done"].id) == {
        "extract_html": 1,
        "text_extraction": 1,
        "text_language_detection": 1,
        "text_spacy": 1,
        "text_html_mapping": 1,
        "text_es_index": 0,
    }
    assert read_all_step_status(db_session, p["image"].id) == {
        "image_metadata_extraction": 1,
        "image_thumbnail": 1,
    }
    assert read_all_step_status(db_session, p["new"].id) == {}
    assert read_step_status(db_session, p["indexing"].id, JobType.TEXT_ES_INDEX) == 0
    assert started == {
        p["done"].id: [JobType.TEXT_ES_INDEX],
        p["language_failed"].id: [JobType.TEXT_ES_INDEX],
    }


def test_enable_feature_fails_the_planned_steps_after_an_erroneous_input(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
):
    """Enabling full-text search plans the core steps text_spacy and
    text_html_mapping for language_failed: text_spacy is erroneous as its input
    language detection is, and text_html_mapping after it as well, as the steps
    are planned in pipeline order. The erroneous language detection is no step
    of full-text search and stays erroneous."""
    sdoc_id = planning_projects["language_failed"].id

    _enable_full_text_search(db_session, planning_projects["project"].id)
    plan_activations(held_jobs)

    assert read_all_step_status(db_session, sdoc_id) == {
        "extract_html": 1,
        "text_extraction": 1,
        "text_language_detection": -100,
        "text_spacy": -100,
        "text_html_mapping": -100,
        "text_es_index": 0,
    }


def test_enable_feature_lets_other_transactions_reference_the_locked_documents(
    db_session: Session,
    planning_projects: PlanningProjects,
    test_user: UserORM,
    held_jobs: HeldJobs,
):
    """While a batch of an activation holds its document locks, another
    transaction can still insert a row that references a planned document (an
    annotation document): the planning locks FOR NO KEY UPDATE, which does not
    conflict with the FOR KEY SHARE lock of a foreign key check. Calls the
    private batch operation of the activation, to hold a batch's transaction
    open."""
    sdoc_id = planning_projects["done"].id
    _enable_full_text_search(db_session, planning_projects["project"].id)
    batch = StepPlanningService()._plan_activation_batch(
        db=db_session, activation=_activation(held_jobs), after_sdoc_id=0
    )
    assert batch is not None and sdoc_id in batch[1]
    errors: list[Exception] = []

    def _annotate() -> None:
        try:
            with SQLRepo().transaction() as db:
                db.execute(text("SET LOCAL lock_timeout = '1500ms'"))
                crud_adoc.exists_or_create(db=db, user_id=test_user.id, sdoc_id=sdoc_id)
        except Exception as e:
            errors.append(e)

    thread = threading.Thread(target=_annotate)
    thread.start()
    thread.join(timeout=10)
    db_session.rollback()

    assert not thread.is_alive()
    assert errors == []


# ===========================================================================
# FEATURE ACTIVATION JOB
# ===========================================================================


def test_activation_plans_in_batches_like_in_one(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
):
    """With one document per batch, enabling full-text search plans and starts
    the same steps as in one batch (`test_enable_feature_plans_only_the_documents_of_the_project`)."""
    p = planning_projects
    monkeypatch.setattr(step_planning_service, "ACTIVATION_BATCH_SIZE", 1)

    _enable_full_text_search(db_session, p["project"].id)
    started = plan_activations(held_jobs)

    assert started == {
        p["done"].id: [JobType.TEXT_ES_INDEX],
        p["language_failed"].id: [JobType.TEXT_ES_INDEX],
    }
    assert read_step_status(db_session, p["done"].id, JobType.TEXT_ES_INDEX) == 0
    assert read_all_step_status(db_session, p["language_failed"].id) == {
        "extract_html": 1,
        "text_extraction": 1,
        "text_language_detection": -100,
        "text_spacy": -100,
        "text_html_mapping": -100,
        "text_es_index": 0,
    }
    assert (
        crud_project.read(db=db_session, id=p["project"].id).feature_activations == {}
    )


def _start_then_disable(**kwargs: Any) -> dict[JobType, Job | None]:
    """Start the steps, then disable full-text search, as a user between two
    batches of the activation."""
    started = start_steps(**kwargs)
    with SQLRepo().transaction() as db:
        StepPlanningService().disable_feature(
            db=db, project_id=kwargs["project_id"], feature=Feature.FULL_TEXT_SEARCH
        )
    return started


def test_activation_stops_when_the_feature_is_disabled_between_batches(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
):
    """With one document per batch, a disable after the first batch (done) has
    started its steps makes the next batch stop the activation: language_failed
    is never planned, and the disable unplanned the index of done."""
    p = planning_projects
    monkeypatch.setattr(step_planning_service, "ACTIVATION_BATCH_SIZE", 1)
    monkeypatch.setattr(step_planning_service, "start_steps", _start_then_disable)
    _enable_full_text_search(db_session, p["project"].id)

    held_jobs.run(JobType.FEATURE_ACTIVATION)

    assert started_steps(held_jobs) == {p["done"].id: [JobType.TEXT_ES_INDEX]}
    assert read_step_status(db_session, p["done"].id, JobType.TEXT_ES_INDEX) is None
    assert (
        read_step_status(db_session, p["language_failed"].id, JobType.TEXT_ES_INDEX)
        is None
    )


def test_activation_leaves_the_documents_after_its_last_document_alone(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
):
    """An activation plans the documents up to the highest id at its request;
    later documents plan their steps on upload. With its last document set to
    done (as if language_failed and image were uploaded after the request), it
    plans done only."""
    p = planning_projects
    _enable_full_text_search(db_session, p["project"].id)
    activation = _activation(held_jobs)
    held_jobs.empty()
    JobService().start_job(
        JobType.FEATURE_ACTIVATION,
        activation.model_copy(update={"last_sdoc_id": p["done"].id}),
    )

    started = plan_activations(held_jobs)

    assert started == {p["done"].id: [JobType.TEXT_ES_INDEX]}
    assert (
        read_step_status(db_session, p["language_failed"].id, JobType.TEXT_ES_INDEX)
        is None
    )


def _fail(*args: object, **kwargs: object) -> None:
    raise RuntimeError("cannot start the steps")


def test_a_failing_activation_removes_the_pending_activation(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
):
    """An activation job that fails (its steps cannot be started) removes the
    feature's pending activation, so the feature does not stay computing for
    it. The batch it planned before stays planned: the index of done is
    processing without a job until a user completes or restarts the feature."""
    p = planning_projects
    _enable_full_text_search(db_session, p["project"].id)
    monkeypatch.setattr(step_planning_service, "start_steps", _fail)

    held_jobs.run(JobType.FEATURE_ACTIVATION)

    assert started_steps(held_jobs) == {}
    db_session.expire_all()
    assert (
        crud_project.read(db=db_session, id=p["project"].id).feature_activations == {}
    )
    assert read_step_status(db_session, p["done"].id, JobType.TEXT_ES_INDEX) == 0


# ===========================================================================
# DISABLE FEATURE
# ===========================================================================


def test_disable_feature_unplans_only_the_processing_steps_of_the_project(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
):
    """After enabling full-text search in project, disabling it unplans the
    processing index of done; its finished steps stay, and the processing index
    of the other project, which enables full-text search too, stays
    processing."""
    p = planning_projects
    service = StepPlanningService()
    _enable_full_text_search(db_session, p["project"].id)
    plan_activations(held_jobs)

    service.disable_feature(
        db=db_session, project_id=p["project"].id, feature=Feature.FULL_TEXT_SEARCH
    )
    db_session.commit()

    assert crud_project.read(db=db_session, id=p["project"].id).enabled_features == []
    assert read_all_step_status(db_session, p["done"].id) == {
        "extract_html": 1,
        "text_extraction": 1,
        "text_language_detection": 1,
        "text_spacy": 1,
        "text_html_mapping": 1,
    }
    assert read_step_status(db_session, p["indexing"].id, JobType.TEXT_ES_INDEX) == 0


# ===========================================================================
# ADD FEATURES
# ===========================================================================


def test_add_features_enables_them_with_their_requirements_and_plans_nothing(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
):
    """Adding RAG chat to the other project, as an import does, keeps full-text
    search and enables sentence similarity search, which RAG chat requires; the
    steps of its documents stay as they are and no job starts."""
    p = planning_projects

    enabled = StepPlanningService().add_features(
        db=db_session, project_id=p["other_project"].id, features=[Feature.RAG_CHAT]
    )
    db_session.commit()

    expected = [
        Feature.FULL_TEXT_SEARCH,
        Feature.SENTENCE_SIMILARITY_SEARCH,
        Feature.RAG_CHAT,
    ]
    assert enabled == expected
    project = crud_project.read(db=db_session, id=p["other_project"].id)
    assert project.enabled_features == expected
    assert read_all_step_status(db_session, p["indexing"].id) == {
        "extract_html": 1,
        "text_extraction": 1,
        "text_language_detection": 1,
        "text_spacy": 1,
        "text_html_mapping": 1,
        "text_es_index": 0,
    }
    assert read_all_step_status(db_session, p["new"].id) == {}
    assert held_jobs.jobs() == []


# ===========================================================================
# PLAN NEW DOCUMENT
# ===========================================================================


def test_plan_new_document_plans_the_steps_of_the_enabled_features(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
):
    """A new text document of the other project, which enables full-text
    search, gets the minimal text steps and the index as processing, and no
    activation job: the upload starts its first step itself."""
    p = planning_projects

    StepPlanningService().plan_new_document(
        db=db_session,
        project_id=p["other_project"].id,
        sdoc_id=p["new"].id,
        doctype=DocType.text,
    )
    db_session.commit()

    assert read_all_step_status(db_session, p["new"].id) == {
        "extract_html": 0,
        "text_extraction": 0,
        "text_language_detection": 0,
        "text_spacy": 0,
        "text_html_mapping": 0,
        "text_es_index": 0,
    }
    assert held_jobs.jobs() == []
