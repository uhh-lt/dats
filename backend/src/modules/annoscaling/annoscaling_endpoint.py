from fastapi import APIRouter, Depends

from common.dependencies import get_current_user
from core.auth.authz_user import AuthzUser
from modules.annoscaling.annoscaling_dto import (
    AnnoscalingConfirmSuggest,
    AnnoscalingResult,
    AnnoscalingSuggest,
)
from modules.annoscaling.annoscaling_service import AnnoScalingService

router = APIRouter(
    prefix="/annoscaling",
    tags=["annoscaling"],
    dependencies=[Depends(get_current_user)],
)

ass: AnnoScalingService = AnnoScalingService()


@router.post(
    "/suggest",
    summary="Suggest annotations",
    description="Suggest annotations",
)
async def suggest(
    *,
    dto: AnnoscalingSuggest,
    authz_user: AuthzUser = Depends(),
) -> list[AnnoscalingResult]:
    authz_user.assert_in_project(dto.project_id)

    result = ass.suggest(
        dto.project_id, [authz_user.user.id], dto.code_id, dto.reject_cide_id, dto.top_k
    )

    return [
        AnnoscalingResult(sdoc_id=sdoc, sentence_id=sent, text=text)
        for sdoc, sent, text in result
    ]


@router.post(
    "/confirm_suggestions",
    summary="Suggest annotations",
    description="Suggest annotations",
)
async def confirm_suggestions(
    *,
    dto: AnnoscalingConfirmSuggest,
    authz_user: AuthzUser = Depends(),
) -> None:
    authz_user.assert_in_project(dto.project_id)

    ass.confirm_suggestions(
        dto.project_id,
        authz_user.user.id,
        dto.code_id,
        dto.reject_code_id,
        accept=[(a.sdoc_id, a.sentence) for a in dto.accept],
        reject=[(r.sdoc_id, r.sentence) for r in dto.reject],
    )
