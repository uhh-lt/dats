from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.word_frequency.word_frequency_columns import WordFrequencyColumns
from modules.word_frequency.word_frequency_dto import (
    WordFrequencyRead,
    WordFrequencyResult,
)
from modules.word_frequency.word_frequency_service import (
    word_frequency,
    word_frequency_export,
    word_frequency_info,
)
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter
from systems.search_system.sorting import Sort

router = APIRouter(
    prefix="/word_frequency",
    dependencies=[Depends(get_current_user)],
    tags=["word_frequency"],
)


@router.get(
    "/info/{project_id}",
    response_model=list[ColumnInfo[WordFrequencyColumns]],
    summary="Returns WordFrequency Info.",
)
def word_frequency_analysis_info(
    *,
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[ColumnInfo[WordFrequencyColumns]]:
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
    sorts: list[Sort[WordFrequencyColumns]],
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
    sorts: list[Sort[WordFrequencyColumns]],
    authz_user: AuthzUser = Depends(),
) -> str:
    authz_user.assert_in_project(project_id)

    return word_frequency_export(
        project_id=project_id,
        filter=filter,
    )


@router.get(
    "/sdoc/{sdoc_id}",
    response_model=list[WordFrequencyRead],
    summary="Returns the SourceDocument's word frequencies with the given ID if it exists",
)
def get_word_frequencies(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[WordFrequencyRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc = Crud.SOURCE_DOCUMENT.value.read(db=db, id=sdoc_id)
    return [WordFrequencyRead.model_validate(wf) for wf in sdoc.word_frequencies]
