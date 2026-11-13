"""The pipeline steps per doctype, taken from the step declarations, and the step
statuses of documents, read and written through crud_sdoc_step_status."""

from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy.orm import Session

from common.artefact_enum import CORE_ARTEFACTS
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from job_test_utils import HeldJobs
from systems.artefact_system import step_run
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.artefact_registry import artefact_registry
from systems.artefact_system.source_document_step_status_crud import (
    crud_sdoc_step_status,
)
from systems.feature_system.feature_registry import feature_registry
from systems.job_system.job_dto import JobInputBase


def all_steps(doctype: DocType) -> list[JobType]:
    """All steps of the doctype, in pipeline order (a project with all features)."""
    return artefact_registry.graph().steps(doctype)


def planned_steps(doctype: DocType, features: list[str]) -> list[JobType]:
    """The steps a new document of the doctype gets in a project with these
    enabled features, in pipeline order: the steps of the core artefacts and
    of the artefacts the features require (`ArtefactService.plan_document`).
    The features are named by text."""
    # imported here: feature_test_utils imports this module
    from feature_test_utils import feature_named

    graph = artefact_registry.graph()
    demand = feature_registry.required_artefacts(feature_named(f) for f in features)
    needed = {
        *graph.steps_for(doctype, CORE_ARTEFACTS),
        *graph.steps_for(doctype, demand),
    }
    return [s for s in graph.steps(doctype) if s in needed]


def core_steps(doctype: DocType) -> list[JobType]:
    """The steps of a project without features, in pipeline order."""
    return planned_steps(doctype, [])


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


@contextmanager
def failing_started_hook() -> Generator[None, None, None]:
    """While the context is open, the started hook of every step job raises as
    it sets the steps processing, as if the database failed, so the job fails
    and its steps become erroneous."""
    set_status = step_run._set_status

    def fail_to_set_processing(
        job_type: JobType,
        input: JobInputBase,
        status: SDocStatus,
        steps: list[JobType] | None = None,
    ) -> None:
        if status == SDocStatus.processing:
            raise RuntimeError("cannot set the steps processing")
        set_status(job_type, input, status, steps)

    step_run._set_status = fail_to_set_processing
    try:
        yield
    finally:
        step_run._set_status = set_status
