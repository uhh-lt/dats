from common.dependencies import DBSession
from common.doc_type_enum import DocType
from common.project_router import project_router
from modules.code_frequency.code_frequency_dto import CodeFrequency, CodeOccurrence
from modules.code_frequency.code_frequency_service import CodeFrequencyService

router = project_router("/code-frequencies", tags=["code_frequency"])


# --- other operations


@router.post(
    "",
    response_model=list[CodeFrequency],
    summary="Returns all SourceDocument IDs that match the query parameters.",
)
def code_frequencies(
    *,
    db: DBSession,
    project_id: int,
    code_ids: list[int],
    user_ids: list[int],
    doctypes: list[DocType],
) -> list[CodeFrequency]:

    return CodeFrequencyService().compute_code_frequencies(
        db=db,
        project_id=project_id,
        code_ids=code_ids,
        user_ids=user_ids,
        doctypes=doctypes,
    )


@router.post(
    "/occurrences",
    response_model=list[CodeOccurrence],
    summary="Returns all SourceDocument IDs that match the query parameters.",
)
def code_occurrences(
    *,
    db: DBSession,
    project_id: int,
    user_ids: list[int],
    code_id: int,
    return_children: bool,
    doctypes: list[DocType],
) -> list[CodeOccurrence]:

    return CodeFrequencyService().compute_code_occurrences(
        db=db,
        project_id=project_id,
        user_ids=user_ids,
        code_id=code_id,
        doctypes=doctypes,
        return_children=return_children,
    )
