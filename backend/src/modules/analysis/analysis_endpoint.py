from typing import List, Tuple

from common.dependencies import get_current_user, get_db_session
from common.doc_type import DocType
from core.auth.authz_user import AuthzUser
from fastapi import APIRouter, Depends
from modules.analysis.analysis_dto import (
    CodeFrequency,
    CodeOccurrence,
    SampledSdocsResults,
    WordFrequencyResult,
)
from modules.analysis.code_frequency.code_frequency import (
    find_code_frequencies,
    find_code_occurrences,
)
from modules.analysis.document_sampler.document_sampler import document_sampler_by_tags
from modules.analysis.statistics.count_metadata import (
    compute_num_sdocs_with_date_metadata,
)
from modules.analysis.word_frequency.word_frequency import (
    word_frequency,
    word_frequency_export,
    word_frequency_info,
)
from modules.analysis.word_frequency.word_frequency_columns import WordFrequencyColumns
from modules.search_system.column_info import ColumnInfo
from modules.search_system.filtering import Filter
from modules.search_system.sorting import Sort
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/analysis", dependencies=[Depends(get_current_user)], tags=["analysis"]
)


@router.post(
    "/code_frequencies",
    response_model=List[CodeFrequency],
    summary="Returns all SourceDocument IDs that match the query parameters.",
)
def code_frequencies(
    *,
    project_id: int,
    code_ids: List[int],
    user_ids: List[int],
    doctypes: List[DocType],
    authz_user: AuthzUser = Depends(),
) -> List[CodeFrequency]:
    authz_user.assert_in_project(project_id)

    return find_code_frequencies(
        project_id=project_id, code_ids=code_ids, user_ids=user_ids, doctypes=doctypes
    )


@router.post(
    "/code_occurrences",
    response_model=List[CodeOccurrence],
    summary="Returns all SourceDocument IDs that match the query parameters.",
)
def code_occurrences(
    *,
    project_id: int,
    user_ids: List[int],
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[CodeOccurrence]:
    authz_user.assert_in_project(project_id)

    return find_code_occurrences(
        project_id=project_id, user_ids=user_ids, code_id=code_id
    )


@router.get(
    "/count_sdocs_with_date_metadata/{project_id}/metadata/{date_metadata_id}}",
    response_model=Tuple[int, int],
    summary="Returns Tuple[num_sdocs_with_date_metadata, num_total_sdocs].",
)
def count_sdocs_with_date_metadata(
    *,
    project_id: int,
    date_metadata_id: int,
    authz_user: AuthzUser = Depends(),
) -> Tuple[int, int]:
    authz_user.assert_in_project(project_id)

    return compute_num_sdocs_with_date_metadata(
        project_id=project_id,
        date_metadata_id=date_metadata_id,
    )


@router.get(
    "/word_frequency_analysis_info/{project_id}",
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
    "/word_frequency_analysis",
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
    "/word_frequency_analysis_export",
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


@router.post(
    "/sample_sdocs_by_tags",
    response_model=List[SampledSdocsResults],
    summary="Sample & Aggregate Source Documents by tags.",
)
def sample_sdocs_by_tags(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    tag_groups: List[List[int]],
    n: int,
    frac: float,
    authz_user: AuthzUser = Depends(),
) -> List[SampledSdocsResults]:
    authz_user.assert_in_project(project_id)
    return document_sampler_by_tags(
        project_id=project_id, tag_ids=tag_groups, n=n, frac=frac
    )
