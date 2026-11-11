"""The pipeline steps per doctype, taken from the step declarations, and the step
statuses of documents, read and written through crud_sdoc_step_status."""

from sqlalchemy.orm import Session

from common.artefact_enum import CORE_ARTEFACTS
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_step_status_crud import crud_sdoc_step_status
from systems.job_system.pipeline_graph import UPLOADED_ARTEFACTS, pipeline_registry


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
