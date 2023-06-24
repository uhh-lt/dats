from typing import List

from app.core.analysis.analysis_service import AnalysisService
from app.core.data.dto.analysis import CodeFrequency, CodeOccurrence
from fastapi import APIRouter

router = APIRouter(prefix="/analysis")
tags = ["analysis"]


@router.post(
    "/code_frequencies",
    tags=tags,
    response_model=List[CodeFrequency],
    summary="Returns all SourceDocument IDs that match the query parameters.",
    description="Returns all SourceDocument Ids that match the query parameters.",
)
async def code_frequencies(
    *, project_id: int, user_ids: List[int], code_ids: List[int]
) -> List[CodeFrequency]:
    return AnalysisService().compute_code_frequency(
        project_id=project_id, user_ids=user_ids, code_ids=code_ids
    )


@router.post(
    "/code_occurrences",
    tags=tags,
    response_model=List[CodeOccurrence],
    summary="Returns all SourceDocument IDs that match the query parameters.",
    description="Returns all SourceDocument Ids that match the query parameters.",
)
async def code_occurrences(
    *, project_id: int, user_ids: List[int], code_id: int
) -> List[CodeOccurrence]:
    return AnalysisService().find_code_occurrences(
        project_id=project_id, user_ids=user_ids, code_id=code_id
    )
