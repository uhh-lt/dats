from typing import List

from fastapi import APIRouter, Depends

from api.dependencies import get_current_user
from app.core.annoscaling.annoscaling_service import AnnoScalingService
from app.core.authorization.authz_user import AuthzUser

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
    project_id: int,
    code_id: int,
    top_k: int,
    authz_user: AuthzUser = Depends(),
) -> List[str]:
    authz_user.assert_in_project(project_id)

    return ass.suggest(project_id, [authz_user.user.id], code_id, top_k)
