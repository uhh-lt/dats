from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from modules.concept_over_time_analysis.cota_crud import crud_cota
from modules.concept_over_time_analysis.cota_dto import (
    ConceptOverTimeAnalysisCreate,
    ConceptOverTimeAnalysisCreateIntern,
    ConceptOverTimeAnalysisRead,
    ConceptOverTimeAnalysisUpdate,
    COTARefinementHyperparameters,
    COTASentenceID,
)
from modules.concept_over_time_analysis.cota_feature import CONCEPTS_OVER_TIME
from modules.concept_over_time_analysis.cota_service import COTAService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

cotas = COTAService()

router = project_router(
    "/concept-over-time-analyses",
    tags=["conceptOverTimeAnalysis"],
    feature=CONCEPTS_OVER_TIME,
)


# --- create operations


@router.put(
    "",
    response_model=ConceptOverTimeAnalysisRead,
    summary="Creates an ConceptOverTimeAnalysis",
    description="Creates an ConceptOverTimeAnalysis",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    cota: ConceptOverTimeAnalysisCreate,
    ws: WebsocketEmitter = Depends(),
) -> ConceptOverTimeAnalysisRead:
    result = cotas.create(
        db=db,
        project_id=project_id,
        cota_create=ConceptOverTimeAnalysisCreateIntern(name=cota.name),
    )
    ws.emit_to_project(DATSEvent.COTA_CREATED, result, project_id=project_id)
    return result


@router.put(
    "/{cota_id}/duplicate",
    response_model=ConceptOverTimeAnalysisRead,
    summary="Duplicates the ConceptOverTimeAnalysis with the given ID if it exists",
)
def duplicate_by_id(
    *,
    db: DBSession,
    project_id: int,
    cota_id: int,
    ws: WebsocketEmitter = Depends(),
) -> ConceptOverTimeAnalysisRead:
    db_obj = crud_cota.duplicate_by_id(db=db, project_id=project_id, cota_id=cota_id)
    result = ConceptOverTimeAnalysisRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.COTA_CREATED, result, project_id=project_id)
    return result


# --- read operations


@router.get(
    "",
    response_model=list[ConceptOverTimeAnalysisRead],
    summary="Returns COTAs of the Project",
    description="Returns the COTAs of the Project",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
) -> list[ConceptOverTimeAnalysisRead]:
    db_objs = crud_cota.read_by_project(db=db, project_id=project_id)
    return [ConceptOverTimeAnalysisRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{cota_id}",
    response_model=ConceptOverTimeAnalysisRead,
    summary="Returns the ConceptOverTimeAnalysis",
    description="Returns the ConceptOverTimeAnalysis with the given ID if it exists",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    cota_id: int,
) -> ConceptOverTimeAnalysisRead:
    db_obj = crud_cota.read(db=db, project_id=project_id, id=cota_id)
    return ConceptOverTimeAnalysisRead.model_validate(db_obj)


# --- update operations


@router.patch(
    "/{cota_id}",
    response_model=ConceptOverTimeAnalysisRead,
    summary="Updates the ConceptOverTimeAnalysis",
    description="Updates the ConceptOverTimeAnalysis with the given ID if it exists",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    cota_id: int,
    cota_update: ConceptOverTimeAnalysisUpdate,
    ws: WebsocketEmitter = Depends(),
) -> ConceptOverTimeAnalysisRead:
    result = cotas.update(
        db=db,
        project_id=project_id,
        cota_id=cota_id,
        cota_update=cota_update,
    )
    ws.emit_to_project(DATSEvent.COTA_UPDATED, result, project_id=project_id)
    return result


@router.patch(
    "/{cota_id}/annotate-sentences",
    response_model=ConceptOverTimeAnalysisRead,
    summary="Annotate (multiple) COTASentences",
)
def annotate_sentences(
    *,
    db: DBSession,
    project_id: int,
    cota_id: int,
    cota_sentence_ids: list[COTASentenceID],
    concept_id: str | None = None,
    ws: WebsocketEmitter = Depends(),
) -> ConceptOverTimeAnalysisRead:
    result = cotas.annotate_sentences(
        db=db,
        project_id=project_id,
        cota_id=cota_id,
        cota_sentence_ids=cota_sentence_ids,
        concept_id=concept_id,
    )
    ws.emit_to_project(DATSEvent.COTA_UPDATED, result, project_id=project_id)
    return result


@router.patch(
    "/{cota_id}/remove-sentences",
    response_model=ConceptOverTimeAnalysisRead,
    summary="Remove (multiple) COTASentences from the search space",
)
def remove_sentences(
    *,
    db: DBSession,
    project_id: int,
    cota_id: int,
    cota_sentence_ids: list[COTASentenceID],
    ws: WebsocketEmitter = Depends(),
) -> ConceptOverTimeAnalysisRead:
    result = cotas.remove_sentences(
        db=db,
        project_id=project_id,
        cota_id=cota_id,
        cota_sentence_ids=cota_sentence_ids,
    )
    ws.emit_to_project(DATSEvent.COTA_UPDATED, result, project_id=project_id)
    return result


@router.patch(
    "/{cota_id}/reset",
    response_model=ConceptOverTimeAnalysisRead,
    summary="Resets the ConceptOverTimeAnalysis",
    description="Resets the ConceptOverTimeAnalysis deleting model, embeddings, refinement jobs and resetting the search space",
)
def reset(
    *,
    db: DBSession,
    project_id: int,
    cota_id: int,
    ws: WebsocketEmitter = Depends(),
) -> ConceptOverTimeAnalysisRead:
    result = cotas.reset(db=db, project_id=project_id, cota_id=cota_id)
    ws.emit_to_project(DATSEvent.COTA_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/{cota_id}",
    response_model=ConceptOverTimeAnalysisRead,
    summary="Removes the ConceptOverTimeAnalysis",
    description="Removes the ConceptOverTimeAnalysis with the given ID if it exists",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    cota_id: int,
    ws: WebsocketEmitter = Depends(),
) -> ConceptOverTimeAnalysisRead:
    db_obj = crud_cota.delete(db=db, project_id=project_id, id=cota_id)
    result = ConceptOverTimeAnalysisRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.COTA_DELETED, result, project_id=project_id)
    return result


# --- job operations


@router.post(
    "/{cota_id}/refine",
    response_model=ConceptOverTimeAnalysisRead,
    summary="Refines the ConceptOverTimeAnalysis",
    description="Starts the refinement job of the ConceptOverTimeAnalysis with the given ID; read the job at /jobs/cota-refinement",
)
def refine(
    *,
    db: DBSession,
    project_id: int,
    cota_id: int,
    hyperparams: COTARefinementHyperparameters,
) -> ConceptOverTimeAnalysisRead:
    return cotas.start_refinement_job(
        db=db, project_id=project_id, cota_id=cota_id, hyperparams=hyperparams
    )
