import threading

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.languages_enum import Language
from core.annotation.annotation_document_crud import crud_adoc
from core.project.project_crud import crud_project
from core.user.user_orm import UserORM
from feature_test_utils import feature_named, minimal_image_steps
from job_test_utils import HeldJobs
from pipeline_test_utils import (
    artefact_named,
    read_all_step_status,
    read_step_status,
    started_steps,
)
from repos.db.sql_repo import SQLRepo
from systems.artefact_system import artefact_service
from systems.artefact_system.artefact_dto import (
    ArtefactComputationJobInput,
    ProcessingSettings,
)
from systems.artefact_system.artefact_service import ArtefactService
from systems.feature_system.feature_service import FeatureService
from systems.job_system.job_service import JobService

from .conftest import PlanningProjects

# The planning operations of ArtefactService (and the actions of FeatureService
# that call them), for what the feature endpoint tests (`endpoints/feature`)
# cannot see: other projects and doctypes, a chain of blocked steps, the
# document locks, the computation job, the features an import adds and the
# planning of a new document.

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
    language=Language.english,
    model="default",
)


def _computation(held_jobs: HeldJobs) -> ArtefactComputationJobInput:
    """The input of the one held artefact computation job."""
    (computation,) = held_jobs.inputs("artefact_computation")
    assert isinstance(computation, ArtefactComputationJobInput)
    return computation


def _enable_keyword_statistics(db: Session, project_id: int) -> None:
    FeatureService().enable_feature(
        db=db,
        project_id=project_id,
        feature=feature_named("keyword_statistics"),
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
    """Enabling keyword statistics in project plans the keywords of its two text
    documents and its image (which has a caption) and starts it where its
    input is finished; the finished steps of done and the image keep their
    status, and the documents of the other project are left alone."""
    p = planning_projects

    _enable_keyword_statistics(db_session, p["project"].id)
    held_jobs.run("artefact_computation")
    started = started_steps(held_jobs)

    assert crud_project.read(db=db_session, id=p["project"].id).enabled_features == [
        "keyword_statistics"
    ]
    assert read_all_step_status(db_session, p["done"].id) == {
        "html_extraction": 1,
        "text_extraction": 1,
        "language_detection": 1,
        "es_index": 1,
        "tokens_sentences": 1,
        "html_mapping": 1,
        "keywords": 0,
    }
    assert read_all_step_status(db_session, p["image"].id) == {
        **dict.fromkeys(minimal_image_steps(), 1),
        "keywords": 0,
    }
    assert read_all_step_status(db_session, p["new"].id) == {}
    assert read_step_status(db_session, p["extracting"].id, "keywords") == 0
    assert started == {
        p["done"].id: ["keywords"],
        p["spacy_failed"].id: ["keywords"],
        p["image"].id: ["keywords"],
    }


def test_enable_feature_fails_the_planned_steps_after_an_erroneous_input(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
):
    """Enabling keyword statistics plans the core step html_mapping for
    spacy_failed: it is erroneous as its input tokens_sentences is. The erroneous
    tokens_sentences is no step of keyword statistics and stays erroneous; the
    keywords start, as their input language detection is finished."""
    sdoc_id = planning_projects["spacy_failed"].id

    _enable_keyword_statistics(db_session, planning_projects["project"].id)
    held_jobs.run("artefact_computation")

    assert read_all_step_status(db_session, sdoc_id) == {
        "html_extraction": 1,
        "text_extraction": 1,
        "language_detection": 1,
        "es_index": 1,
        "tokens_sentences": -100,
        "html_mapping": -100,
        "keywords": 0,
    }


def test_enable_feature_lets_other_transactions_reference_the_locked_documents(
    db_session: Session,
    planning_projects: PlanningProjects,
    test_user: UserORM,
    held_jobs: HeldJobs,
):
    """While a batch of a computation holds its document locks, another
    transaction can still insert a row that references a planned document (an
    annotation document): the planning locks FOR NO KEY UPDATE, which does not
    conflict with the FOR KEY SHARE lock of a foreign key check. Calls the
    private batch operation of the computation, to hold a batch's transaction
    open."""
    sdoc_id = planning_projects["done"].id
    _enable_keyword_statistics(db_session, planning_projects["project"].id)
    batch = ArtefactService()._plan_batch(
        db=db_session, computation=_computation(held_jobs), after_sdoc_id=0
    )
    assert batch is not None and sdoc_id in batch[1]
    errors: list[Exception] = []

    def _annotate() -> None:
        try:
            with SQLRepo().transaction() as db:
                db.execute(text("SET LOCAL lock_timeout = '1500ms'"))
                crud_adoc.exists_or_create(
                    db=db,
                    project_id=planning_projects["project"].id,
                    user_id=test_user.id,
                    sdoc_id=sdoc_id,
                )
        except Exception as e:
            errors.append(e)

    thread = threading.Thread(target=_annotate)
    thread.start()
    thread.join(timeout=10)
    db_session.rollback()

    assert not thread.is_alive()
    assert errors == []


# ===========================================================================
# ARTEFACT COMPUTATION JOB
# ===========================================================================


def test_computation_plans_in_batches_like_in_one(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
):
    """With one document per batch, enabling keyword statistics plans and starts
    the same steps as in one batch (`test_enable_feature_plans_only_the_documents_of_the_project`)."""
    p = planning_projects
    monkeypatch.setattr(artefact_service, "COMPUTATION_BATCH_SIZE", 1)

    _enable_keyword_statistics(db_session, p["project"].id)
    held_jobs.run("artefact_computation")
    started = started_steps(held_jobs)

    assert started == {
        p["done"].id: ["keywords"],
        p["spacy_failed"].id: ["keywords"],
        p["image"].id: ["keywords"],
    }
    assert read_step_status(db_session, p["done"].id, "keywords") == 0
    assert read_all_step_status(db_session, p["spacy_failed"].id) == {
        "html_extraction": 1,
        "text_extraction": 1,
        "language_detection": 1,
        "es_index": 1,
        "tokens_sentences": -100,
        "html_mapping": -100,
        "keywords": 0,
    }
    assert (
        crud_project.read(db=db_session, id=p["project"].id).artefact_computations == {}
    )


def test_computation_leaves_the_documents_after_its_last_document_alone(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
):
    """A computation plans the documents up to the highest id at its request;
    later documents plan their steps on upload. With its last document set to
    done (as if spacy_failed and image were uploaded after the request), it
    plans done only."""
    p = planning_projects
    _enable_keyword_statistics(db_session, p["project"].id)
    computation = _computation(held_jobs)
    held_jobs.empty()
    JobService().start_job(
        "artefact_computation",
        computation.model_copy(update={"last_sdoc_id": p["done"].id}),
    )

    held_jobs.run("artefact_computation")

    started = started_steps(held_jobs)

    assert started == {p["done"].id: ["keywords"]}
    assert read_step_status(db_session, p["spacy_failed"].id, "keywords") is None


def _fail(*args: object, **kwargs: object) -> None:
    raise RuntimeError("cannot start the steps")


def test_a_failing_computation_removes_the_pending_computation(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
):
    """A computation job that fails (here its steps cannot be started) ends
    through its failure callback: the feature's pending computation is removed,
    so the feature does not stay computing for it. The keywords of done, which
    the committed batch planned before the failure, stay processing without
    a job: the accepted gap of a process that dies between writing processing
    and queueing; Recompute starts it."""
    p = planning_projects
    _enable_keyword_statistics(db_session, p["project"].id)
    monkeypatch.setattr(artefact_service, "start_steps", _fail)

    held_jobs.run("artefact_computation")

    assert started_steps(held_jobs) == {}
    db_session.expire_all()
    assert (
        crud_project.read(db=db_session, id=p["project"].id).artefact_computations == {}
    )
    assert read_step_status(db_session, p["done"].id, "keywords") == 0


# ===========================================================================
# ADD FEATURES (FeatureService, for an import)
# ===========================================================================


def test_add_features_enables_them_and_plans_nothing(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
):
    """Adding RAG chat to the other project, as an import does, keeps keyword
    statistics and enables RAG chat alone; the steps of its documents stay as they
    are and no job starts."""
    p = planning_projects

    enabled = FeatureService().add_features(
        db=db_session,
        project_id=p["other_project"].id,
        features=[feature_named("rag_chat")],
    )
    db_session.commit()

    expected = ["keyword_statistics", "rag_chat"]
    assert [f.name for f in enabled] == expected
    project = crud_project.read(db=db_session, id=p["other_project"].id)
    assert project.enabled_features == expected
    assert read_all_step_status(db_session, p["extracting"].id) == {
        "html_extraction": 1,
        "text_extraction": 1,
        "language_detection": 1,
        "es_index": 1,
        "tokens_sentences": 1,
        "html_mapping": 1,
        "keywords": 0,
    }
    assert read_all_step_status(db_session, p["new"].id) == {}
    assert held_jobs.jobs() == []


# ===========================================================================
# PLAN DOCUMENT
# ===========================================================================


def test_plan_document_plans_the_steps_of_the_artefact_demand(
    db_session: Session,
    planning_projects: PlanningProjects,
    held_jobs: HeldJobs,
):
    """A new text document of the other project, which enables keyword
    statistics, gets the minimal text steps and the keywords as processing, and no
    computation job: the upload starts the returned root step itself."""
    p = planning_projects

    demand = FeatureService().read_artefact_demand(
        db=db_session, project_id=p["other_project"].id
    )
    roots = ArtefactService().plan_document(
        db=db_session, sdoc_id=p["new"].id, doctype=DocType.text, demand=demand
    )
    db_session.commit()

    assert demand == {artefact_named("keywords")}
    assert roots == ["html_extraction"]

    assert read_all_step_status(db_session, p["new"].id) == {
        "html_extraction": 0,
        "text_extraction": 0,
        "language_detection": 0,
        "es_index": 0,
        "tokens_sentences": 0,
        "html_mapping": 0,
        "keywords": 0,
    }
    assert held_jobs.jobs() == []
