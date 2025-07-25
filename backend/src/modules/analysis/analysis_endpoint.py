from typing import List, Tuple

from common.dependencies import get_current_user, get_db_session
from common.doc_type import DocType
from core.auth.authz_user import AuthzUser
from fastapi import APIRouter, Depends
from modules.analysis.analysis_dto import (
    CodeFrequency,
    CodeOccurrence,
    SampledSdocsResults,
)
from modules.analysis.code_frequency import (
    find_code_frequencies,
    find_code_occurrences,
)
from modules.analysis.count_metadata import (
    compute_num_sdocs_with_date_metadata,
)
from modules.analysis.document_sampler import document_sampler_by_tags
from modules.analysis.duplicate_finder import find_duplicates
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


@router.post(
    "/{proj_id}/find_duplicate_text_sdocs",
    response_model=List[List[int]],
    summary="Returns groups of duplicate sdoc ids.",
)
def find_duplicate_text_sdocs(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    max_different_words: int,
    authz_user: AuthzUser = Depends(),
) -> List[List[int]]:
    authz_user.assert_in_project(proj_id)
    return find_duplicates(project_id=proj_id, max_different_words=max_different_words)
