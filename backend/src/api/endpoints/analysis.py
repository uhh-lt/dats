from typing import Dict, Any

from fastapi import APIRouter

from app.core.analysis.analysis_service import AnalysisService
from app.core.data.dto.analysis import AnalysisQueryParameters

router = APIRouter(prefix="/analysis")
tags = ["analysis"]


@router.post(
    "/frequency_analysis",
    tags=tags,
    response_model=Dict[str, Any],
    summary="Returns all SourceDocument IDs that match the query parameters.",
    description="Returns all SourceDocument Ids that match the query parameters.",
)
async def frequency_analysis(
    *, query_params: AnalysisQueryParameters
) -> Dict[str, Any]:  # todo: should return CodeFrequencies
    return AnalysisService().analyse_code_frequencies(query_params=query_params)
