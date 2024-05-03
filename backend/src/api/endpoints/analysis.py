from typing import List, Tuple

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.analysis.analysis_service import AnalysisService
from app.core.analysis.annotated_segments import (
    AnnotatedSegmentsColumns,
    find_annotated_segments,
    find_annotated_segments_info,
)
from app.core.analysis.timeline import (
    TimelineAnalysisColumns,
    timeline_analysis,
    timeline_analysis_info,
    timeline_analysis_valid_documents,
)
from app.core.analysis.word_frequency import (
    WordFrequencyColumns,
    word_frequency,
    word_frequency_info,
)
from app.core.authorization.authz_user import AuthzUser
from app.core.data.dto.analysis import (
    AnnotatedSegmentResult,
    AnnotationOccurrence,
    CodeFrequency,
    CodeOccurrence,
    DateGroupBy,
    SampledSdocsResults,
    TimelineAnalysisResultNew,
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
    authz_user: AuthzUser = Depends(),
) -> List[CodeFrequency]:
    authz_user.assert_in_project(project_id)

    return AnalysisService().compute_code_frequency(
        project_id=project_id, code_ids=code_ids, user_ids=user_ids
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
    user_ids: List[int],
    filter: Filter[AnnotatedSegmentsColumns],
    page: int,
    page_size: int,
    sorts: List[Sort[AnnotatedSegmentsColumns]],
    authz_user: AuthzUser = Depends(),
) -> AnnotatedSegmentResult:
    authz_user.assert_in_project(project_id)

    return find_annotated_segments(
        project_id=project_id,
        user_ids=user_ids,
        filter=filter,
        page=page,
        page_size=page_size,
        sorts=sorts,
    )


@router.get(
    "/timeline_analysis_valid_docments/{project_id}/metadata/{date_metadata_id}}",
    response_model=Tuple[int, int],
    summary="Returns TimelineAnalysis Info.",
)
def get_timeline_analysis_valid_documents(
    *,
    project_id: int,
    date_metadata_id: int,
    authz_user: AuthzUser = Depends(),
) -> Tuple[int, int]:
    authz_user.assert_in_project(project_id)

    return timeline_analysis_valid_documents(
        project_id=project_id,
        date_metadata_id=date_metadata_id,
    )


@router.get(
    "/timeline_analysis2_info/{project_id}",
    response_model=List[ColumnInfo[TimelineAnalysisColumns]],
    summary="Returns TimelineAnalysis Info.",
)
def timeline_analysis2_info(
    *,
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[ColumnInfo[TimelineAnalysisColumns]]:
    authz_user.assert_in_project(project_id)

    return timeline_analysis_info(
        project_id=project_id,
    )


@router.post(
    "/timeline_analysis2",
    response_model=List[TimelineAnalysisResultNew],
    summary="Perform new timeline analysis.",
)
def timeline_analysis2(
    *,
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter[TimelineAnalysisColumns],
    authz_user: AuthzUser = Depends(),
) -> List[TimelineAnalysisResultNew]:
    authz_user.assert_in_project(project_id)

    return timeline_analysis(
        project_id=project_id,
        group_by=group_by,
        project_metadata_id=project_metadata_id,
        filter=filter,
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
