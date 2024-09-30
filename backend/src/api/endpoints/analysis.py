from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.analysis.analysis_service import AnalysisService
from app.core.analysis.annotated_images import (
    AnnotatedImagesColumns,
    find_annotated_images,
    find_annotated_images_info,
)
from app.core.analysis.annotated_segments import (
    AnnotatedSegmentsColumns,
    find_annotated_segments,
    find_annotated_segments_info,
)
from app.core.analysis.word_frequency import (
    WordFrequencyColumns,
    word_frequency,
    word_frequency_info,
)
from app.core.authorization.authz_user import AuthzUser
from app.core.data.doc_type import DocType
from app.core.data.dto.analysis import (
    AnnotatedImageResult,
    AnnotatedSegmentResult,
    AnnotationOccurrence,
    CodeFrequency,
    CodeOccurrence,
    SampledSdocsResults,
    WordFrequencyResult,
)
from app.core.filters.columns import ColumnInfo
from app.core.filters.filtering import Filter
from app.core.filters.sorting import Sort

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

    return AnalysisService().compute_code_frequency(
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

    return AnalysisService().find_code_occurrences(
        project_id=project_id, user_ids=user_ids, code_id=code_id
    )


@router.post(
    "/annotation_occurrences",
    response_model=List[AnnotationOccurrence],
    summary="Returns AnnotationOccurrences.",
)
def annotation_occurrences(
    *,
    project_id: int,
    user_ids: List[int],
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[AnnotationOccurrence]:
    authz_user.assert_in_project(project_id)

    return AnalysisService().find_annotation_occurrences(
        project_id=project_id, user_ids=user_ids, code_id=code_id
    )


@router.post(
    "/annotated_segments_info",
    response_model=List[ColumnInfo[AnnotatedSegmentsColumns]],
    summary="Returns AnnotationSegments Info.",
)
def annotated_segments_info(
    *,
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[ColumnInfo[AnnotatedSegmentsColumns]]:
    authz_user.assert_in_project(project_id)
    return find_annotated_segments_info(
        project_id=project_id,
    )


@router.post(
    "/annotated_segments",
    response_model=AnnotatedSegmentResult,
    summary="Returns AnnotationSegments.",
)
def annotated_segments(
    *,
    project_id: int,
    user_id: int,
    filter: Filter[AnnotatedSegmentsColumns],
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    sorts: List[Sort[AnnotatedSegmentsColumns]],
    authz_user: AuthzUser = Depends(),
) -> AnnotatedSegmentResult:
    authz_user.assert_in_project(project_id)

    return find_annotated_segments(
        project_id=project_id,
        user_id=user_id,
        filter=filter,
        page=page,
        page_size=page_size,
        sorts=sorts,
    )


@router.post(
    "/annotated_images_info",
    response_model=List[ColumnInfo[AnnotatedImagesColumns]],
    summary="Returns AnnotationSegments Info.",
)
def annotated_images_info(
    *,
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[ColumnInfo[AnnotatedImagesColumns]]:
    authz_user.assert_in_project(project_id)
    return find_annotated_images_info(
        project_id=project_id,
    )


@router.post(
    "/annotated_images",
    response_model=AnnotatedImageResult,
    summary="Returns AnnotatedImageResult.",
)
def annotated_images(
    *,
    project_id: int,
    user_id: int,
    filter: Filter[AnnotatedImagesColumns],
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    sorts: List[Sort[AnnotatedImagesColumns]],
    authz_user: AuthzUser = Depends(),
) -> AnnotatedImageResult:
    authz_user.assert_in_project(project_id)

    return find_annotated_images(
        project_id=project_id,
        user_id=user_id,
        filter=filter,
        page=page,
        page_size=page_size,
        sorts=sorts,
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

    return AnalysisService().count_sdocs_with_date_metadata(
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
    return AnalysisService().sample_sdocs_by_tags(
        project_id=project_id, tag_ids=tag_groups, n=n, frac=frac
    )
