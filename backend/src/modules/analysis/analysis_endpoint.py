from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from common.doc_type import DocType
from core.auth.authz_user import AuthzUser
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

router = APIRouter(
    prefix="/analysis", dependencies=[Depends(get_current_user)], tags=["analysis"]
)


@router.post(
    "/code_frequencies",
    response_model=list[CodeFrequency],
    summary="Returns all SourceDocument IDs that match the query parameters.",
)
def code_frequencies(
    *,
    project_id: int,
    code_ids: list[int],
    user_ids: list[int],
    doctypes: list[DocType],
    authz_user: AuthzUser = Depends(),
) -> list[CodeFrequency]:
    authz_user.assert_in_project(project_id)

    return find_code_frequencies(
        project_id=project_id, code_ids=code_ids, user_ids=user_ids, doctypes=doctypes
    )


@router.post(
    "/code_occurrences",
    response_model=list[CodeOccurrence],
    summary="Returns all SourceDocument IDs that match the query parameters.",
)
def code_occurrences(
    *,
    project_id: int,
    user_ids: list[int],
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[CodeOccurrence]:
    authz_user.assert_in_project(project_id)

    return find_code_occurrences(
        project_id=project_id, user_ids=user_ids, code_id=code_id
    )


@router.get(
    "/count_sdocs_with_date_metadata/{project_id}/metadata/{date_metadata_id}}",
    response_model=tuple[int, int],
    summary="Returns tuple[num_sdocs_with_date_metadata, num_total_sdocs].",
)
def count_sdocs_with_date_metadata(
    *,
    project_id: int,
    date_metadata_id: int,
    authz_user: AuthzUser = Depends(),
) -> tuple[int, int]:
    authz_user.assert_in_project(project_id)

    return compute_num_sdocs_with_date_metadata(
        project_id=project_id,
        date_metadata_id=date_metadata_id,
    )


@router.post(
    "/sample_sdocs_by_tags",
    response_model=list[SampledSdocsResults],
    summary="Sample & Aggregate Source Documents by tags.",
)
def sample_sdocs_by_tags(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    tag_groups: list[list[int]],
    n: int,
    frac: float,
    authz_user: AuthzUser = Depends(),
) -> list[SampledSdocsResults]:
    authz_user.assert_in_project(project_id)
    return document_sampler_by_tags(
        project_id=project_id, tag_ids=tag_groups, n=n, frac=frac
    )
