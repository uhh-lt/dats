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
from app.core.data.dto.analysis import (
    AnnotatedSegmentResult,
    AnnotationOccurrence,
    CodeFrequency,
    CodeOccurrence,
    DateGroupBy,
    TimelineAnalysisResultNew,
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
    description="Returns all SourceDocument Ids that match the query parameters.",
)
async def code_frequencies(
    *,
    project_id: int,
    code_ids: List[int],
    user_ids: List[int],
) -> List[CodeFrequency]:
    return AnalysisService().compute_code_frequency(
        project_id=project_id, code_ids=code_ids, user_ids=user_ids
    )


@router.post(
    "/code_occurrences",
    response_model=List[CodeOccurrence],
    summary="Returns all SourceDocument IDs that match the query parameters.",
    description="Returns all SourceDocument Ids that match the query parameters.",
)
async def code_occurrences(
    *,
    project_id: int,
    user_ids: List[int],
    code_id: int,
) -> List[CodeOccurrence]:
    return AnalysisService().find_code_occurrences(
        project_id=project_id, user_ids=user_ids, code_id=code_id
    )


@router.post(
    "/annotation_occurrences",
    response_model=List[AnnotationOccurrence],
    summary="Returns AnnotationOccurrences.",
    description="Returns AnnotationOccurrences.",
)
async def annotation_occurrences(
    *, project_id: int, user_ids: List[int], code_id: int
) -> List[AnnotationOccurrence]:
    return AnalysisService().find_annotation_occurrences(
        project_id=project_id, user_ids=user_ids, code_id=code_id
    )


@router.post(
    "/annotated_segments_info",
    response_model=List[ColumnInfo[AnnotatedSegmentsColumns]],
    summary="Returns AnnotationSegments Info.",
    description="Returns AnnotationSegments Info.",
)
async def annotated_segments_info(
    *,
    project_id: int,
) -> List[ColumnInfo[AnnotatedSegmentsColumns]]:
    return find_annotated_segments_info(
        project_id=project_id,
    )


@router.post(
    "/annotated_segments",
    response_model=AnnotatedSegmentResult,
    summary="Returns AnnotationSegments.",
    description="Returns AnnotationSegments.",
)
async def annotated_segments(
    *,
    project_id: int,
    user_ids: List[int],
    filter: Filter[AnnotatedSegmentsColumns],
    page: int,
    page_size: int,
    sorts: List[Sort[AnnotatedSegmentsColumns]],
) -> AnnotatedSegmentResult:
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
    description="Returns TimelineAnalysis Info.",
)
async def get_timeline_analysis_valid_documents(
    *,
    project_id: int,
    date_metadata_id: int,
) -> Tuple[int, int]:
    return timeline_analysis_valid_documents(
        project_id=project_id,
        date_metadata_id=date_metadata_id,
    )


@router.get(
    "/timeline_analysis2_info/{project_id}",
    response_model=List[ColumnInfo[TimelineAnalysisColumns]],
    summary="Returns TimelineAnalysis Info.",
    description="Returns TimelineAnalysis Info.",
)
async def timeline_analysis2_info(
    *,
    project_id: int,
) -> List[ColumnInfo[TimelineAnalysisColumns]]:
    return timeline_analysis_info(
        project_id=project_id,
    )


@router.post(
    "/timeline_analysis2",
    response_model=List[TimelineAnalysisResultNew],
    summary="Perform new timeline analysis.",
    description="Perform new timeline analysis.",
)
async def timeline_analysis2(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter[TimelineAnalysisColumns],
) -> List[TimelineAnalysisResultNew]:
    return timeline_analysis(
        project_id=project_id,
        group_by=group_by,
        project_metadata_id=project_metadata_id,
        filter=filter,
    )
