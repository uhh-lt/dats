from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.timeline_analysis.timeline_analysis_crud import (
    crud_timeline_analysis,
)
from modules.timeline_analysis.timeline_analysis_dto import (
    TimelineAnalysisCreate,
    TimelineAnalysisCreateIntern,
    TimelineAnalysisRead,
    TimelineAnalysisUpdate,
)
from modules.timeline_analysis.timeline_analysis_service import (
    recompute_timeline_analysis,
    update_timeline_analysis,
)

router = APIRouter(
    prefix="/timelineAnalysis",
    dependencies=[Depends(get_current_user)],
    tags=["timelineAnalysis"],
)


@router.put(
    "",
    response_model=TimelineAnalysisRead,
    summary="Creates an TimelineAnalysis",
)
def create(
    *,
    db: Session = Depends(get_db_session),
    timeline_analysis: TimelineAnalysisCreate,
    authz_user: AuthzUser = Depends(),
) -> TimelineAnalysisRead:
    authz_user.assert_in_project(timeline_analysis.project_id)

    return TimelineAnalysisRead.model_validate(
        crud_timeline_analysis.create(
            db=db,
            create_dto=TimelineAnalysisCreateIntern(
                **timeline_analysis.model_dump(),
            ),
        )
    )


@router.get(
    "/{timeline_analysis_id}",
    response_model=TimelineAnalysisRead,
    summary="Returns the TimelineAnalysis with the given ID if it exists",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    timeline_analysis_id: int,
    authz_user: AuthzUser = Depends(),
) -> TimelineAnalysisRead:
    authz_user.assert_in_same_project_as(Crud.TIMELINE_ANALYSIS, timeline_analysis_id)

    db_obj = crud_timeline_analysis.read(db=db, id=timeline_analysis_id)
    return TimelineAnalysisRead.model_validate(db_obj)


@router.get(
    "/project/{project_id}",
    response_model=list[TimelineAnalysisRead],
    summary="Returns the TimelineAnalysis of the Project with the given ID if it exists",
)
def get_by_project(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[TimelineAnalysisRead]:
    authz_user.assert_in_project(project_id)

    db_objs = crud_timeline_analysis.read_by_project(db=db, project_id=project_id)
    return [TimelineAnalysisRead.model_validate(db_obj) for db_obj in db_objs]


@router.patch(
    "/{timeline_analysis_id}",
    response_model=TimelineAnalysisRead,
    summary="Updates the TimelineAnalysis with the given ID if it exists",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    timeline_analysis_id: int,
    timeline_analysis: TimelineAnalysisUpdate,
    authz_user: AuthzUser = Depends(),
) -> TimelineAnalysisRead:
    authz_user.assert_in_same_project_as(Crud.TIMELINE_ANALYSIS, timeline_analysis_id)

    db_obj = update_timeline_analysis(
        db=db, id=timeline_analysis_id, update_dto=timeline_analysis
    )
    return TimelineAnalysisRead.model_validate(db_obj)


@router.post(
    "/recompute/{timeline_analysis_id}",
    response_model=TimelineAnalysisRead,
    summary="Recomputes the TimelineAnalysis with the given ID if it exists",
)
def recompute_by_id(
    *,
    db: Session = Depends(get_db_session),
    timeline_analysis_id: int,
    authz_user: AuthzUser = Depends(),
) -> TimelineAnalysisRead:
    authz_user.assert_in_same_project_as(Crud.TIMELINE_ANALYSIS, timeline_analysis_id)

    db_obj = recompute_timeline_analysis(db=db, id=timeline_analysis_id)
    return TimelineAnalysisRead.model_validate(db_obj)


@router.post(
    "/duplicate/{timeline_analysis_id}",
    response_model=TimelineAnalysisRead,
    summary="Duplicates the TimelineAnalysis with the given ID if it exists",
)
def duplicate_by_id(
    *,
    db: Session = Depends(get_db_session),
    timeline_analysis_id: int,
    authz_user: AuthzUser = Depends(),
) -> TimelineAnalysisRead:
    authz_user.assert_in_same_project_as(Crud.TIMELINE_ANALYSIS, timeline_analysis_id)

    db_obj = crud_timeline_analysis.duplicate_by_id(
        db=db, timeline_analysis_id=timeline_analysis_id, user_id=authz_user.user.id
    )
    return TimelineAnalysisRead.model_validate(db_obj)


@router.delete(
    "/{timeline_analysis_id}",
    response_model=TimelineAnalysisRead,
    summary="Removes the TimelineAnalysis with the given ID if it exists",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    timeline_analysis_id: int,
    authz_user: AuthzUser = Depends(),
) -> TimelineAnalysisRead:
    authz_user.assert_in_same_project_as(Crud.TIMELINE_ANALYSIS, timeline_analysis_id)

    db_obj = crud_timeline_analysis.delete(db=db, id=timeline_analysis_id)
    return TimelineAnalysisRead.model_validate(db_obj)
