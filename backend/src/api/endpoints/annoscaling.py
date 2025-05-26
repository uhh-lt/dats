from typing import List

from app.core.annoscaling.annoscaling_service import AnnoScalingService
from app.core.authorization.authz_user import AuthzUser
from app.core.data.dto.annoscaling import (
    AnnoscalingConfirmSuggest,
    AnnoscalingResult,
    AnnoscalingSuggest,
)
from fastapi import APIRouter, Depends

from api.dependencies import get_current_user

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
) -> List[AnnoscalingResult]:
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
