from common.dependencies import DBSession
from common.project_router import project_router
from modules.agreement.agreement_dto import (
    AgreementParams,
    AgreementResult,
    AgreementTextRange,
)
from modules.agreement.agreement_service import AgreementService

router = project_router("/agreements", tags=["agreement"])


# --- other operations


@router.post(
    "",
    response_model=AgreementResult,
    summary="Compare the annotations of two annotators: scores, confusion matrix and segments.",
)
def compute_agreement(
    *,
    db: DBSession,
    project_id: int,
    params: AgreementParams,
) -> AgreementResult:
    return AgreementService().compute_agreement(
        db=db, project_id=project_id, params=params
    )


@router.post(
    "/export",
    response_model=str,
    summary="Export the raw agreement counts (TP, FP, FN) per document and code as CSV.",
)
def export(
    *,
    db: DBSession,
    project_id: int,
    params: AgreementParams,
) -> str:
    return AgreementService().export_counts(db=db, project_id=project_id, params=params)


@router.post(
    "/segment-texts",
    response_model=list[str],
    summary="Returns the texts of segments (character ranges of documents), in the order of the request.",
)
def compute_segment_texts(
    *,
    db: DBSession,
    project_id: int,
    ranges: list[AgreementTextRange],
) -> list[str]:
    return AgreementService().read_segment_texts(
        db=db, project_id=project_id, ranges=ranges
    )
