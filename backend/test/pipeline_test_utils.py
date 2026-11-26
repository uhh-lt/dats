"""The pipeline steps per doctype, taken from the step declarations, and the step
statuses of documents, read and written through crud_sdoc_step_status."""

from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_orm import SourceDocumentORM
from job_test_utils import HeldJobs
from systems.artefact_system import step_execution
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.artefact_registry import Artefact, artefact_registry
from systems.artefact_system.source_document_step_status_crud import (
    crud_sdoc_step_status,
)
from systems.feature_system.feature_registry import feature_registry
from systems.job_system.job_dto import JobInputBase


def artefact_named(name: str) -> Artefact:
    """The registered artefact of this name: tests name artefacts by text and
    never import an artefact object from a module path."""
    artefact = artefact_registry.artefact(name)
    assert artefact is not None, f"no artefact '{name}' is registered"
    return artefact


def all_steps(doctype: DocType) -> list[str]:
    """All steps of the doctype, in pipeline order (a project with all features)."""
    return artefact_registry.graph().steps(doctype)


def planned_steps(doctype: DocType, features: list[str]) -> list[str]:
    """The steps a new document of the doctype gets in a project with these
    enabled features, in pipeline order: the steps of the core artefacts and
    of the artefacts the features require (`ArtefactService.plan_document`).
    The features are named by text."""
    # imported here: feature_test_utils imports this module
    from feature_test_utils import feature_named

    graph = artefact_registry.graph()
    demand = feature_registry.required_artefacts(feature_named(f) for f in features)
    needed = {
        *graph.steps_for(doctype, artefact_registry.always()),
        *graph.steps_for(doctype, demand),
    }
    return [s for s in graph.steps(doctype) if s in needed]


def core_steps(doctype: DocType) -> list[str]:
    """The steps of a project without features, in pipeline order."""
    return planned_steps(doctype, [])


def _project_of(db: Session, sdoc_id: int) -> int:
    """The project of the document. The tests create documents with ids that
    are unique in the test database, so `one()` finds exactly one."""
    return (
        db.query(SourceDocumentORM.project_id)
        .filter(SourceDocumentORM.id == sdoc_id)
        .one()[0]
    )


def set_step_status(db: Session, sdoc_id: int, status: dict[str, int]) -> None:
    """Set the status of the given steps of the document (planning them)."""
    project_id = _project_of(db, sdoc_id)
    for step, value in status.items():
        crud_sdoc_step_status.update_status(
            db=db,
            project_id=project_id,
            sdoc_ids=[sdoc_id],
            steps=[str(step)],
            status=SDocStatus(value),
        )


def read_step_status(db: Session, sdoc_id: int, step: str) -> int | None:
    """The status of the step of the document, None if it is not planned."""
    db.expire_all()
    status = crud_sdoc_step_status.read_by_sdoc(
        db=db, project_id=_project_of(db, sdoc_id), sdoc_id=sdoc_id
    ).get(step)
    db.commit()
    return None if status is None else status.value


def read_all_step_status(db: Session, sdoc_id: int) -> dict[str, int]:
    """The status of every planned step of the document."""
    db.expire_all()
    status = crud_sdoc_step_status.read_by_sdoc(
        db=db, project_id=_project_of(db, sdoc_id), sdoc_id=sdoc_id
    )
    db.commit()
    return {step: value.value for step, value in status.items()}


def count_processing_sdocs(db: Session, project_id: int) -> int:
    """The number of documents of the project with a processing step."""
    db.expire_all()
    sdocs = crud_sdoc.read_by_project(db=db, project_id=project_id, only_finished=False)
    status = crud_sdoc_step_status.read_by_sdocs(
        db=db, project_id=project_id, sdoc_ids=[sdoc.id for sdoc in sdocs]
    )
    db.commit()
    return sum(SDocStatus.processing in s.values() for s in status.values())


def started_steps(held_jobs: HeldJobs) -> dict[int, list[str]]:
    """The steps of the held step jobs per document, in the order the jobs were
    started (a step job is named like its step)."""
    result: dict[int, list[str]] = {}
    for job_type, payload in held_jobs.jobs():
        if isinstance(payload, SdocProcessingJobInput):
            result.setdefault(payload.sdoc_id, []).append(job_type)
    return result


@contextmanager
def failing_started_hook() -> Generator[None, None, None]:
    """While the context is open, the started hook of every step job raises as
    it sets the steps processing, as if the database failed, so the job fails
    and its steps become erroneous."""
    set_status = step_execution._set_status

    def fail_to_set_processing(
        job_type: str,
        input: JobInputBase,
        status: SDocStatus,
    ) -> None:
        if status == SDocStatus.processing:
            raise RuntimeError("cannot set the steps processing")
        set_status(job_type, input, status)

    step_execution._set_status = fail_to_set_processing
    try:
        yield
    finally:
        step_execution._set_status = set_status
