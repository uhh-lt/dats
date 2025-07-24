from typing import List

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from fastapi import APIRouter, Depends
from modules.search_system.column_info import ColumnInfo
from modules.search_system.filtering import Filter
from modules.search_system.sorting import Sort
from modules.word_frequency.word_frequency_columns import WordFrequencyColumns
from modules.word_frequency.word_frequency_dto import WordFrequencyResult
from modules.word_frequency.word_frequency_service import (
    word_frequency,
    word_frequency_export,
    word_frequency_info,
)
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/word_frequency",
    dependencies=[Depends(get_current_user)],
    tags=["word_frequency"],
)


@router.get(
    "/info/{project_id}",
    response_model=List[ColumnInfo[WordFrequencyColumns]],
    summary="Returns WordFrequency Info.",
)
def word_frequency_analysis_info(
    *,
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[ColumnInfo[WordFrequencyColumns]]:
    authz_user.assert_in_project(project_id)

    return word_frequency_info(
        project_id=project_id,
    )


@router.post(
    "/analysis",
    response_model=WordFrequencyResult,
    summary="Perform word frequency analysis.",
)
def word_frequency_analysis(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    filter: Filter[WordFrequencyColumns],
    page: int,
    page_size: int,
    sorts: List[Sort[WordFrequencyColumns]],
    authz_user: AuthzUser = Depends(),
) -> WordFrequencyResult:
    authz_user.assert_in_project(project_id)

    return word_frequency(
        project_id=project_id,
        filter=filter,
        page=page,
        page_size=page_size,
        sorts=sorts,
    )


@router.post(
    "/export",
    response_model=str,
    summary="Export the word frequency analysis.",
)
def word_frequency_analysis_export(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    filter: Filter[WordFrequencyColumns],
    sorts: List[Sort[WordFrequencyColumns]],
    authz_user: AuthzUser = Depends(),
) -> str:
    authz_user.assert_in_project(project_id)

    return word_frequency_export(
        project_id=project_id,
        filter=filter,
    )
