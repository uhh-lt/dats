from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.agreement.agreement_dto import AgreementParams, AgreementResult
from modules.agreement.agreement_service import AgreementService

router = APIRouter(
    prefix="/agreement",
    dependencies=[Depends(get_current_user)],
    tags=["agreement"],
)


# --- other operations


@router.post(
    "/compute",
    response_model=AgreementResult,
    summary="Compare the annotations of two annotators: scores, confusion matrix and segments.",
)
def compute_agreement(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    params: AgreementParams,
    authz_user: AuthzUser = Depends(),
) -> AgreementResult:
    authz_user.assert_in_project(project_id)

    return AgreementService().compute_agreement(
        db=db, project_id=project_id, params=params
    )


@router.post(
    "/export_counts",
    response_model=str,
    summary="Export the raw agreement counts (TP, FP, FN) per document and code as CSV.",
)
def export_agreement_counts(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    params: AgreementParams,
    authz_user: AuthzUser = Depends(),
) -> str:
    authz_user.assert_in_project(project_id)

    return AgreementService().export_counts(db=db, project_id=project_id, params=params)
