from typing import List

from fastapi import APIRouter

from app.core.annoscaling.annoscaling_service import AnnoScalingService

router = APIRouter(prefix="/annoscaling", tags=["annoscaling"])

ass: AnnoScalingService = AnnoScalingService()


@router.post(
    "/suggest",
    summary="Suggest annotations",
    description="Suggest annotations",
)
async def suggest(
    *, project_id: int, user_id: int, code_id: int
) -> List[str]:
    return ass.suggest(project_id, [user_id], code_id)
