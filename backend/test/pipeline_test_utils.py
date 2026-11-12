"""The pipeline steps per doctype, taken from the step declarations, and the step
statuses of documents, read and written through crud_sdoc_step_status."""

from unittest.mock import MagicMock

from pydantic import ValidationError
from sqlalchemy.orm import Session

from common.artefact_enum import CORE_ARTEFACTS
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_step_status_crud import crud_sdoc_step_status
from modules.doc_processing.doc_processing_pipeline import (
    handle_job_finished,
    handle_job_started,
)
from modules.doc_processing.pipeline.pipeline_graph import (
    UPLOADED_ARTEFACTS,
    pipeline_registry,
)
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService


def all_steps(doctype: DocType) -> list[JobType]:
    """All steps of the doctype, in pipeline order (a project with all features)."""
    return pipeline_registry.graph().steps(doctype)


def core_steps(doctype: DocType) -> list[JobType]:
    """The steps of a project without features, in pipeline order: the steps that
    produce core artefacts only and whose inputs a document of the doctype has
    (an image has no text without a caption, so no text steps)."""
    graph = pipeline_registry.graph()
    available = set(UPLOADED_ARTEFACTS.get(doctype, frozenset()))
    steps: list[JobType] = []
    for step in graph.steps(doctype):
        declaration = graph.declaration(step)
        if declaration.produces <= CORE_ARTEFACTS and declaration.requires <= available:
            steps.append(step)
            available |= declaration.produces
    return steps


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


def enrich_job_input(job_type: JobType, payload: JobInputBase) -> JobInputBase:
    """The input of the job as the worker gets it: a bare step input is enriched
    as `start_job` does."""
    job_info = JobService().job_registry[job_type]
    try:
        return job_info["input_type"].model_validate(payload.model_dump())
    except ValidationError:
        enricher = job_info["enricher"]
        assert enricher is not None
        return enricher(payload)


def run_job(job_type: JobType, payload: JobInputBase) -> None:
    """Run the job like the worker: enrich its input, then its handler between the
    pipeline hooks (which start the next jobs)."""
    job_info = JobService().job_registry[job_type]
    job_input = enrich_job_input(job_type, payload)
    assert handle_job_started(job_type, job_input)
    output = job_info["handler"](payload=job_input, job=MagicMock())
    handle_job_finished(job_type, job_input, output)


def last_started(
    started_jobs: list[tuple[JobType, JobInputBase]], job_type: JobType
) -> JobInputBase:
    """The input of the last captured job of this type."""
    return [payload for jt, payload in started_jobs if jt == job_type][-1]
