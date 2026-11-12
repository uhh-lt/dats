"""The pipeline steps per doctype, taken from the step declarations, and the step
statuses of documents, read and written through crud_sdoc_step_status."""

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_step_status_crud import crud_sdoc_step_status
from job_test_utils import HeldJobs
from modules.doc_processing.doc_processing_dto import (
    FeatureActivationJobInput,
    SdocProcessingJobInput,
)
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.pipeline.step_planning import planned_steps
from modules.doc_processing.step_planning_service import StepPlanningService
from repos.db.sql_repo import SQLRepo


def all_steps(doctype: DocType) -> list[JobType]:
    """All steps of the doctype, in pipeline order (a project with all features)."""
    return pipeline_registry.graph().steps(doctype)


def core_steps(doctype: DocType) -> list[JobType]:
    """The steps of a project without features, in pipeline order."""
    return planned_steps(doctype=doctype, features=[])


def step_names(steps: list[JobType]) -> list[str]:
    return [step.value for step in steps]


def set_step_status(db: Session, sdoc_id: int, status: dict[str, int]) -> None:
    """Set the status of the given steps of the document (planning them)."""
    for step, value in status.items():
        crud_sdoc_step_status.update_status(
            db=db, sdoc_ids=[sdoc_id], steps=[JobType(step)], status=SDocStatus(value)
        )


def read_step_status(db: Session, sdoc_id: int, step: JobType) -> int | None:
    """The status of the step of the document, None if it is not planned."""
    db.expire_all()
    status = crud_sdoc_step_status.read_by_sdoc(db=db, sdoc_id=sdoc_id).get(step)
    db.commit()
    return None if status is None else status.value


def read_all_step_status(db: Session, sdoc_id: int) -> dict[str, int]:
    """The status of every planned step of the document."""
    db.expire_all()
    status = crud_sdoc_step_status.read_by_sdoc(db=db, sdoc_id=sdoc_id)
    db.commit()
    return {step.value: value.value for step, value in status.items()}


def count_processing_sdocs(db: Session, project_id: int) -> int:
    """The number of documents of the project with a processing step."""
    db.expire_all()
    sdocs = crud_sdoc.read_by_project(db=db, project_id=project_id, only_finished=False)
    status = crud_sdoc_step_status.read_by_sdocs(
        db=db, sdoc_ids=[sdoc.id for sdoc in sdocs]
    )
    db.commit()
    return sum(SDocStatus.processing in s.values() for s in status.values())


def started_steps(held_jobs: HeldJobs) -> dict[int, list[JobType]]:
    """The steps of the held step jobs per document, in the order the jobs were
    started."""
    result: dict[int, list[JobType]] = {}
    for _, payload in held_jobs.jobs():
        if isinstance(payload, SdocProcessingJobInput) and payload.steps:
            result.setdefault(payload.sdoc_id, []).extend(payload.steps)
    return result


def plan_activations(held_jobs: HeldJobs) -> dict[int, list[JobType]]:
    """Plan the held feature activations batch by batch through
    `StepPlanningService`, as the activation job does, without starting the
    steps: the fixture documents lack the data their step jobs read
    (`test_feature_activation_e2e.py` runs the real job). Drops the held jobs.
    Returns the steps the job would start, per document."""
    service = StepPlanningService()
    sqlr = SQLRepo()
    result: dict[int, list[JobType]] = {}
    for activation in held_jobs.inputs(JobType.FEATURE_ACTIVATION):
        assert isinstance(activation, FeatureActivationJobInput)
        after_sdoc_id = 0
        while True:
            with sqlr.transaction() as db:
                batch = service.plan_activation_batch(
                    db=db, activation=activation, after_sdoc_id=after_sdoc_id
                )
            if batch is None:
                break
            after_sdoc_id, sdoc_steps = batch
            for sdoc_id, steps in sdoc_steps.items():
                result.setdefault(sdoc_id, []).extend(steps)
        with sqlr.transaction() as db:
            service.finish_activation(db=db, activation=activation)
    held_jobs.empty()
    return result
