from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.analysis.timeline_analysis.timeline import (
    timeline_analysis,
    timeline_analysis_info,
)
from app.core.analysis.timeline_analysis.timeline_analysis_columns import (
    TimelineAnalysisColumns,
)
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.timeline_analysis import crud_timeline_analysis
from app.core.data.dto.analysis import DateGroupBy, TimelineAnalysisResult
from app.core.data.dto.timeline_analysis import (
    TimelineAnalysisCreate,
    TimelineAnalysisCreateIntern,
    TimelineAnalysisRead,
    TimelineAnalysisUpdate,
)
from app.core.filters.column_info import ColumnInfo
from app.core.filters.filtering import Filter

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
                **timeline_analysis.model_dump(), user_id=authz_user.user.id
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
    "/project/{project_id}/user",
    response_model=List[TimelineAnalysisRead],
    summary="Returns the TimelineAnalysis of the Project with the given ID and the logged-in User if it exists",
)
def get_by_project_and_user(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[TimelineAnalysisRead]:
    authz_user.assert_in_project(project_id)

    db_objs = crud_timeline_analysis.read_by_project_and_user(
        db=db, project_id=project_id, user_id=authz_user.user.id
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


@router.get(
    "/info/{project_id}",
    response_model=List[ColumnInfo[TimelineAnalysisColumns]],
    summary="Returns TimelineAnalysis Info.",
)
def info(
    *,
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[ColumnInfo[TimelineAnalysisColumns]]:
    authz_user.assert_in_project(project_id)

    return timeline_analysis_info(
        project_id=project_id,
    )


@router.post(
    "/do_analysis",
    response_model=List[TimelineAnalysisResult],
    summary="Perform new timeline analysis.",
)
def do_analysis(
    *,
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter[TimelineAnalysisColumns],
    authz_user: AuthzUser = Depends(),
) -> List[TimelineAnalysisResult]:
    authz_user.assert_in_project(project_id)

    return timeline_analysis(
        project_id=project_id,
        group_by=group_by,
        project_metadata_id=project_metadata_id,
        filter=filter,
    )
