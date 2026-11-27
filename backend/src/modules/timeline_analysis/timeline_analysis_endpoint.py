from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from modules.timeline_analysis.timeline_analysis_crud import (
    crud_timeline_analysis,
)
from modules.timeline_analysis.timeline_analysis_dto import (
    TimelineAnalysisCreate,
    TimelineAnalysisCreateIntern,
    TimelineAnalysisRead,
    TimelineAnalysisUpdate,
)
from modules.timeline_analysis.timeline_analysis_service import TimelineAnalysisService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/timeline-analyses", tags=["timelineAnalysis"])


# --- create operations


@router.put(
    "",
    response_model=TimelineAnalysisRead,
    summary="Creates an TimelineAnalysis",
)
def create(
    *,
    db: DBSession,
    project_id: int,
    timeline_analysis: TimelineAnalysisCreate,
    ws: WebsocketEmitter = Depends(),
) -> TimelineAnalysisRead:
    result = TimelineAnalysisRead.model_validate(
        crud_timeline_analysis.create(
            db=db,
            project_id=project_id,
            create_dto=TimelineAnalysisCreateIntern(**timeline_analysis.model_dump()),
        )
    )
    ws.emit_to_project(
        DATSEvent.TIMELINE_ANALYSIS_CREATED, result, project_id=project_id
    )
    return result


@router.put(
    "/{timeline_analysis_id}/duplicate",
    response_model=TimelineAnalysisRead,
    summary="Duplicates the TimelineAnalysis with the given ID if it exists",
)
def duplicate(
    *,
    db: DBSession,
    project_id: int,
    timeline_analysis_id: int,
    ws: WebsocketEmitter = Depends(),
) -> TimelineAnalysisRead:
    db_obj = crud_timeline_analysis.duplicate_by_id(
        db=db, project_id=project_id, timeline_analysis_id=timeline_analysis_id
    )
    result = TimelineAnalysisRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.TIMELINE_ANALYSIS_CREATED, result, project_id=project_id
    )
    return result


# --- read operations


@router.get(
    "",
    response_model=list[TimelineAnalysisRead],
    summary="Returns the TimelineAnalyses of the Project",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
) -> list[TimelineAnalysisRead]:
    db_objs = crud_timeline_analysis.read_by_project(db=db, project_id=project_id)
    return [TimelineAnalysisRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{timeline_analysis_id}",
    response_model=TimelineAnalysisRead,
    summary="Returns the TimelineAnalysis with the given ID if it exists",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    timeline_analysis_id: int,
) -> TimelineAnalysisRead:
    db_obj = crud_timeline_analysis.read(
        db=db, project_id=project_id, id=timeline_analysis_id
    )
    return TimelineAnalysisRead.model_validate(db_obj)


# --- update operations


@router.patch(
    "/{timeline_analysis_id}",
    response_model=TimelineAnalysisRead,
    summary="Updates the TimelineAnalysis with the given ID if it exists",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    timeline_analysis_id: int,
    timeline_analysis: TimelineAnalysisUpdate,
    ws: WebsocketEmitter = Depends(),
) -> TimelineAnalysisRead:
    result = TimelineAnalysisService().update_timeline_analysis(
        db=db,
        project_id=project_id,
        id=timeline_analysis_id,
        update_dto=timeline_analysis,
    )
    ws.emit_to_project(
        DATSEvent.TIMELINE_ANALYSIS_UPDATED, result, project_id=project_id
    )
    return result


@router.patch(
    "/{timeline_analysis_id}/recompute",
    response_model=TimelineAnalysisRead,
    summary="Recomputes the TimelineAnalysis with the given ID if it exists",
)
def recompute(
    *,
    db: DBSession,
    project_id: int,
    timeline_analysis_id: int,
    ws: WebsocketEmitter = Depends(),
) -> TimelineAnalysisRead:
    result = TimelineAnalysisService().recompute_timeline_analysis(
        db=db, project_id=project_id, id=timeline_analysis_id
    )
    ws.emit_to_project(
        DATSEvent.TIMELINE_ANALYSIS_UPDATED, result, project_id=project_id
    )
    return result


# --- delete operations


@router.delete(
    "/{timeline_analysis_id}",
    response_model=TimelineAnalysisRead,
    summary="Removes the TimelineAnalysis with the given ID if it exists",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    timeline_analysis_id: int,
    ws: WebsocketEmitter = Depends(),
) -> TimelineAnalysisRead:
    db_obj = crud_timeline_analysis.delete(
        db=db, project_id=project_id, id=timeline_analysis_id
    )
    result = TimelineAnalysisRead.model_validate(db_obj)
    ws.emit_to_project(
        DATSEvent.TIMELINE_ANALYSIS_DELETED, result, project_id=project_id
    )
    return result
