from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.timeline_analysis import crud_timeline_analysis
from app.core.data.dto.timeline_analysis import (
    TimelineAnalysisCreate,
    TimelineAnalysisRead,
    TimelineAnalysisUpdate,
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
    authz_user.assert_is_same_user(timeline_analysis.user_id)

    return TimelineAnalysisRead.model_validate(
        crud_timeline_analysis.create(db=db, create_dto=timeline_analysis)
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
    "/project/{project_id}/user/{user_id}",
    response_model=List[TimelineAnalysisRead],
    summary="Returns the TimelineAnalysis of the Project with the given ID and the User with the given ID if it exists",
)
def get_by_project_and_user(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[TimelineAnalysisRead]:
    # No need to authorize against the user:
    # all users can see all timeline analysis in the project
    # at the moment.
    authz_user.assert_in_project(project_id)

    db_objs = crud_timeline_analysis.read_by_project_and_user(
        db=db, project_id=project_id, user_id=user_id
    )
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

    db_obj = crud_timeline_analysis.update(
        db=db, id=timeline_analysis_id, update_dto=timeline_analysis
    )
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

    db_obj = crud_timeline_analysis.remove(db=db, id=timeline_analysis_id)
    return TimelineAnalysisRead.model_validate(db_obj)
