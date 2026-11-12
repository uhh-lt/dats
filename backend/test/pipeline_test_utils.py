"""The pipeline steps per doctype, taken from the step declarations, and the step
statuses of documents, read and written through crud_sdoc_step_status."""

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_step_status_crud import crud_sdoc_step_status
from job_test_utils import HeldJobs
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.pipeline.step_planning import planned_steps


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
