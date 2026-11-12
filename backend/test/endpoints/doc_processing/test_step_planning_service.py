import threading

from sqlalchemy import text
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from common.languages_enum import Language
from core.annotation.annotation_document_crud import crud_adoc
from core.project.project_crud import crud_project
from core.user.user_orm import UserORM
from modules.doc_processing.doc_processing_dto import (
    FeatureActivationJobInput,
    ProcessingSettings,
)
from modules.doc_processing.step_planning_service import StepPlanningService
from pipeline_test_utils import read_all_step_status, read_step_status
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import JobInputBase

from .conftest import PlanningProjects

# The planning operations at the interface of StepPlanningService, for what the
# feature endpoint tests (`endpoints/project_features`) cannot see: other
# projects and doctypes, a chain of blocked steps, the document locks and the
# planning of a new document.

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
    language=Language.english,
    model="default",
)


def _activation_job(
    started_jobs: list[tuple[JobType, JobInputBase]],
) -> FeatureActivationJobInput:
    assert len(started_jobs) == 1, started_jobs
    job_type, payload = started_jobs[0]
    assert job_type == JobType.FEATURE_ACTIVATION
    assert isinstance(payload, FeatureActivationJobInput)
    return payload


# ===========================================================================
# ENABLE FEATURE
# ===========================================================================


def test_enable_feature_plans_only_the_documents_of_the_project(
    db_session: Session,
    planning_projects: PlanningProjects,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """Enabling full-text search in project plans the index of its two text
    documents and starts it where its input is finished; the finished steps of
    done keep their status, and the image and the documents of the other
    project are left alone."""
    p = planning_projects

    StepPlanningService().enable_feature(
        db=db_session,
        project_id=p["project"].id,
        feature=Feature.FULL_TEXT_SEARCH,
        settings=SETTINGS,
    )
    db_session.commit()

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
    assert _activation_job(started_jobs).sdoc_steps == {
        p["done"].id: [JobType.TEXT_ES_INDEX],
        p["language_failed"].id: [JobType.TEXT_ES_INDEX],
    }


def test_enable_feature_fails_the_planned_steps_after_an_erroneous_input(
    db_session: Session,
    planning_projects: PlanningProjects,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """Enabling full-text search plans the core steps text_spacy and
    text_html_mapping for language_failed: text_spacy is erroneous as its input
    language detection is, and text_html_mapping after it as well, as the steps
    are planned in pipeline order. The erroneous language detection is no step
    of full-text search and stays erroneous."""
    sdoc_id = planning_projects["language_failed"].id

    StepPlanningService().enable_feature(
        db=db_session,
        project_id=planning_projects["project"].id,
        feature=Feature.FULL_TEXT_SEARCH,
        settings=SETTINGS,
    )
    db_session.commit()

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
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """While a planning holds its document locks, another transaction can still
    insert a row that references a planned document (an annotation document):
    the planning locks FOR NO KEY UPDATE, which does not conflict with the FOR
    KEY SHARE lock of a foreign key check."""
    sdoc_id = planning_projects["done"].id
    StepPlanningService().enable_feature(
        db=db_session,
        project_id=planning_projects["project"].id,
        feature=Feature.FULL_TEXT_SEARCH,
        settings=SETTINGS,
    )
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
# DISABLE FEATURE
# ===========================================================================


def test_disable_feature_unplans_only_the_processing_steps_of_the_project(
    db_session: Session,
    planning_projects: PlanningProjects,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """After enabling full-text search in project, disabling it unplans the
    processing index of done; its finished steps stay, and the processing index
    of the other project, which enables full-text search too, stays
    processing."""
    p = planning_projects
    service = StepPlanningService()
    service.enable_feature(
        db=db_session,
        project_id=p["project"].id,
        feature=Feature.FULL_TEXT_SEARCH,
        settings=SETTINGS,
    )
    db_session.commit()

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
# PLAN NEW DOCUMENT
# ===========================================================================


def test_plan_new_document_plans_the_steps_of_the_enabled_features(
    db_session: Session,
    planning_projects: PlanningProjects,
    started_jobs: list[tuple[JobType, JobInputBase]],
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
    assert started_jobs == []
