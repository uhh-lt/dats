from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.concept_over_time_analysis.cota_crud import crud_cota
from modules.concept_over_time_analysis.cota_dto import (
    COTACreate,
    COTACreateIntern,
    COTARead,
    COTARefinementJobInput,
    COTARefinementJobRead,
    COTASentenceID,
    COTAUpdate,
)
from modules.concept_over_time_analysis.cota_service import COTAService
from systems.job_system.job_service import JobService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

cotas = COTAService()
js = JobService()

router = APIRouter(
    prefix="/cota",
    dependencies=[Depends(get_current_user)],
    tags=["conceptOverTimeAnalysis"],
)


# --- Create Operations


@router.put(
    "",
    response_model=COTARead,
    summary="Creates an ConceptOverTimeAnalysis",
    description="Creates an ConceptOverTimeAnalysis",
)
def create(
    *,
    db: Session = Depends(get_db_session),
    cota: COTACreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> COTARead:
    authz_user.assert_in_project(cota.project_id)

    result = cotas.create(
        db=db,
        cota_create=COTACreateIntern(name=cota.name, project_id=cota.project_id),
    )
    ws.emit_to_project(DATSEvent.COTA_CREATED, result, project_id=cota.project_id)
    return result


@router.put(
    "/duplicate/{cota_id}",
    response_model=COTARead,
    summary="Duplicates the ConceptOverTimeAnalysis with the given ID if it exists",
)
def duplicate_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    db_obj = crud_cota.duplicate_by_id(db=db, cota_id=cota_id)
    result = COTARead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.COTA_CREATED, result, project_id=db_obj.get_project_id()
    )
    return result


# --- Read Operations


@router.get(
    "/{cota_id}",
    response_model=COTARead,
    summary="Returns the ConceptOverTimeAnalysis",
    description="Returns the ConceptOverTimeAnalysis with the given ID if it exists",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    authz_user: AuthzUser = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    db_obj = crud_cota.read(db=db, id=cota_id)
    return COTARead.model_validate(db_obj)


@router.get(
    "/project/{project_id}",
    response_model=list[COTARead],
    summary="Returns COTAs of the Project",
    description="Returns the COTA of the Project with the given ID if it exists",
)
def get_by_project(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[COTARead]:
    authz_user.assert_in_project(project_id)

    db_objs = crud_cota.read_by_project(db=db, project_id=project_id)
    return [COTARead.model_validate(db_obj) for db_obj in db_objs]


# --- Update Operations


@router.patch(
    "/{cota_id}",
    response_model=COTARead,
    summary="Updates the ConceptOverTimeAnalysis",
    description="Updates the ConceptOverTimeAnalysis with the given ID if it exists",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    cota_upate: COTAUpdate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    result = cotas.update(
        db=db,
        cota_id=cota_id,
        cota_update=cota_upate,
    )
    db_obj = crud_cota.read(db=db, id=cota_id)
    ws.emit_to_project(
        DATSEvent.COTA_UPDATED, result, project_id=db_obj.get_project_id()
    )
    return result


@router.patch(
    "/annotate/{cota_id}",
    response_model=COTARead,
    summary="Annotate (multiple) COTASentences",
)
def annotate_cota_sentence(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    cota_sentence_ids: list[COTASentenceID],
    concept_id: str | None = None,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    result = cotas.annotate_sentences(
        db=db,
        cota_id=cota_id,
        cota_sentence_ids=cota_sentence_ids,
        concept_id=concept_id,
    )
    ws.emit_to_project(DATSEvent.COTA_UPDATED, result, project_id=result.project_id)
    return result


@router.patch(
    "/remove/{cota_id}",
    response_model=COTARead,
    summary="Remove (multiple) COTASentences from the search space",
)
def remove_cota_sentence(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    cota_sentence_ids: list[COTASentenceID],
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    result = cotas.remove_sentences(
        db=db,
        cota_id=cota_id,
        cota_sentence_ids=cota_sentence_ids,
    )
    ws.emit_to_project(DATSEvent.COTA_UPDATED, result, project_id=result.project_id)
    return result


@router.patch(
    "/reset/{cota_id}",
    response_model=COTARead,
    summary="Resets the ConceptOverTimeAnalysis",
    description="Resets the ConceptOverTimeAnalysis deleting model, embeddings, refinement jobs and resetting the search space",
)
def reset_cota(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    result = cotas.reset(
        db=db,
        cota_id=cota_id,
    )
    ws.emit_to_project(DATSEvent.COTA_UPDATED, result, project_id=result.project_id)
    return result


# --- Delete Operations


@router.delete(
    "/{cota_id}",
    response_model=COTARead,
    summary="Removes the ConceptOverTimeAnalysis",
    description="Removes the ConceptOverTimeAnalysis with the given ID if it exists",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    cota = crud_cota.read(db=db, id=cota_id)
    project_id = cota.get_project_id()
    db_obj = crud_cota.delete(db=db, id=cota_id)
    result = COTARead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.COTA_DELETED, result, project_id=project_id)
    return result


# --- Job Operations


@router.post(
    "/refine",
    response_model=COTARead,
    summary="Refines the ConceptOverTimeAnalysis",
    description="Refines the ConceptOverTimeAnalysis with the given ID if it exists",
)
def refine_cota(
    *,
    db: Session = Depends(get_db_session),
    payload: COTARefinementJobInput,
    authz_user: AuthzUser = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, payload.cota_id)
    # SYNC-TODO: refine launches a refinement job; result is the COTA — handling TBD
    cota_orm = cotas.start_refinement_job(db=db, payload=payload)
    return COTARead.model_validate(cota_orm)


@router.get(
    "/refine/{cota_job_id}",
    response_model=COTARefinementJobRead,
    summary="Returns the COTA Refinement Job for the given ID",
    description="Returns the COTA Refinement Job for the given ID if it exists",
)
def get_cota_job(
    *,
    cota_job_id: str,
    authz_user: AuthzUser = Depends(),
) -> COTARefinementJobRead:
    job = js.get_job(job_id=cota_job_id)
    authz_user.assert_in_project(job.get_project_id())
    return COTARefinementJobRead.from_rq_job(job=job)
