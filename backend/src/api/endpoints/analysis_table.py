from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.data.crud.analysis_table import crud_analysis_table
from app.core.data.dto.analysis_table import (
    AnalysisTableCreate,
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
    response_model=Optional[AnalysisTableRead],
    summary="Creates an AnalysisTable",
    description="Creates an AnalysisTable",
)
async def create(
    *, db: Session = Depends(get_db_session), analysis_table: AnalysisTableCreate
) -> Optional[AnalysisTableRead]:
    return AnalysisTableRead.from_orm(
        crud_analysis_table.create(db=db, create_dto=analysis_table)
    )


@router.get(
    "/{analysis_table_id}",
    response_model=Optional[AnalysisTableRead],
    summary="Returns the AnalysisTable",
    description="Returns the AnalysisTable with the given ID if it exists",
)
async def get_by_id(
    *, db: Session = Depends(get_db_session), analysis_table_id: int
) -> Optional[AnalysisTableRead]:
    db_obj = crud_analysis_table.read(db=db, id=analysis_table_id)
    return AnalysisTableRead.from_orm(db_obj)


@router.get(
    "/project/{project_id}/user/{user_id}",
    response_model=List[AnalysisTableRead],
    summary="Returns AnalysisTables of the Project of the User",
    description="Returns the AnalysisTable of the Project with the given ID and the User with the given ID if it exists",
)
async def get_by_project_and_user(
    *, db: Session = Depends(get_db_session), project_id: int, user_id: int
) -> List[AnalysisTableRead]:
    db_objs = crud_analysis_table.read_by_project_and_user(
        db=db, project_id=project_id, user_id=user_id, raise_error=False
    )
    return [AnalysisTableRead.from_orm(db_obj) for db_obj in db_objs]


@router.patch(
    "/{analysis_table_id}",
    response_model=Optional[AnalysisTableRead],
    summary="Updates the Analysis Table",
    description="Updates the Analysis Table with the given ID if it exists",
)
async def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    analysis_table_id: int,
    analysis_table: AnalysisTableUpdate,
) -> Optional[AnalysisTableRead]:
    db_obj = crud_analysis_table.update(
        db=db, id=analysis_table_id, update_dto=analysis_table
    )
    return AnalysisTableRead.from_orm(db_obj)


@router.delete(
    "/{analysis_table_id}",
    response_model=Optional[AnalysisTableRead],
    summary="Removes the AnalysisTable",
    description="Removes the AnalysisTable with the given ID if it exists",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), analysis_table_id: int
) -> Optional[AnalysisTableRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_analysis_table.remove(db=db, id=analysis_table_id)
    return AnalysisTableRead.from_orm(db_obj)
