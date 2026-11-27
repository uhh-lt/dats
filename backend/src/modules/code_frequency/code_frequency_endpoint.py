from common.dependencies import DBSession
from common.project_router import project_router
from modules.code_frequency.code_frequency_dto import (
    CodeFrequency,
    CodeFrequencyRequest,
    CodeOccurrence,
    CodeOccurrenceRequest,
)
from modules.code_frequency.code_frequency_service import CodeFrequencyService

router = project_router("/code-frequencies", tags=["codeFrequency"])


# --- other operations


@router.post(
    "",
    response_model=list[CodeFrequency],
    summary="Returns all SourceDocument IDs that match the query parameters.",
)
def compute_code_frequencies(
    *,
    db: DBSession,
    project_id: int,
    request: CodeFrequencyRequest,
) -> list[CodeFrequency]:

    return CodeFrequencyService().compute_code_frequencies(
        db=db,
        project_id=project_id,
        code_ids=request.code_ids,
        user_ids=request.user_ids,
        doctypes=request.doctypes,
    )


@router.post(
    "/occurrences",
    response_model=list[CodeOccurrence],
    summary="Returns all SourceDocument IDs that match the query parameters.",
)
def compute_code_occurrences(
    *,
    db: DBSession,
    project_id: int,
    request: CodeOccurrenceRequest,
) -> list[CodeOccurrence]:

    return CodeFrequencyService().compute_code_occurrences(
        db=db,
        project_id=project_id,
        user_ids=request.user_ids,
        code_id=request.code_id,
        doctypes=request.doctypes,
        return_children=request.return_children,
    )
