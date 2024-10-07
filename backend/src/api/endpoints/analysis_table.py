from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.analysis_table import crud_analysis_table
from app.core.data.dto.analysis_table import (
    AnalysisTableCreate,
    AnalysisTableCreateIntern,
    AnalysisTableRead,
    AnalysisTableUpdate,
)

router = APIRouter(
    prefix="/analysisTable",
    dependencies=[Depends(get_current_user)],
    tags=["analysisTable"],
)


@router.put(
    "",
    response_model=AnalysisTableRead,
    summary="Creates an AnalysisTable",
)
def create(
    *,
    db: Session = Depends(get_db_session),
    analysis_table: AnalysisTableCreate,
    authz_user: AuthzUser = Depends(),
) -> AnalysisTableRead:
    authz_user.assert_in_project(analysis_table.project_id)

    return AnalysisTableRead.model_validate(
        crud_analysis_table.create(
            db=db,
            create_dto=AnalysisTableCreateIntern(
                **analysis_table.model_dump(), user_id=authz_user.user.id
            ),
        )
    )


@router.get(
    "/{analysis_table_id}",
    response_model=AnalysisTableRead,
    summary="Returns the AnalysisTable with the given ID if it exists",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    analysis_table_id: int,
    authz_user: AuthzUser = Depends(),
) -> AnalysisTableRead:
    authz_user.assert_in_same_project_as(Crud.ANALYSIS_TABLE, analysis_table_id)

    db_obj = crud_analysis_table.read(db=db, id=analysis_table_id)
    return AnalysisTableRead.model_validate(db_obj)


@router.get(
    "/project/{project_id}/user",
    response_model=List[AnalysisTableRead],
    summary="Returns the AnalysisTable of the Project with the given ID and the logged-in User if it exists",
)
def get_by_project_and_user(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[AnalysisTableRead]:
    # No need to authorize against the user:
    # all users can see all analysis tables in the project
    # at the moment.
    authz_user.assert_in_project(project_id)

    db_objs = crud_analysis_table.read_by_project_and_user(
        db=db, project_id=project_id, user_id=authz_user.user.id
    )
    return [AnalysisTableRead.model_validate(db_obj) for db_obj in db_objs]


@router.patch(
    "/{analysis_table_id}",
    response_model=AnalysisTableRead,
    summary="Updates the Analysis Table with the given ID if it exists",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    analysis_table_id: int,
    analysis_table: AnalysisTableUpdate,
    authz_user: AuthzUser = Depends(),
) -> AnalysisTableRead:
    authz_user.assert_in_same_project_as(Crud.ANALYSIS_TABLE, analysis_table_id)

    db_obj = crud_analysis_table.update(
        db=db, id=analysis_table_id, update_dto=analysis_table
    )
    return AnalysisTableRead.model_validate(db_obj)


@router.post(
    "/duplicate/{analysis_table_id}",
    response_model=AnalysisTableRead,
    summary="Duplicate the Analysis Table with the given ID if it exists",
)
def duplicate_by_id(
    *,
    db: Session = Depends(get_db_session),
    analysis_table_id: int,
    authz_user: AuthzUser = Depends(),
) -> AnalysisTableRead:
    authz_user.assert_in_same_project_as(Crud.ANALYSIS_TABLE, analysis_table_id)

    db_obj = crud_analysis_table.duplicate_by_id(
        db=db, analysis_table_id=analysis_table_id, user_id=authz_user.user.id
    )
    return AnalysisTableRead.model_validate(db_obj)


@router.delete(
    "/{analysis_table_id}",
    response_model=AnalysisTableRead,
    summary="Removes the AnalysisTable with the given ID if it exists",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    analysis_table_id: int,
    authz_user: AuthzUser = Depends(),
) -> AnalysisTableRead:
    authz_user.assert_in_same_project_as(Crud.ANALYSIS_TABLE, analysis_table_id)

    db_obj = crud_analysis_table.remove(db=db, id=analysis_table_id)
    return AnalysisTableRead.model_validate(db_obj)
