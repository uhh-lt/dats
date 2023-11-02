from typing import List

from fastapi import APIRouter

from app.core.annoscaling.annoscaling_service import AnnoScalingService

router = APIRouter(prefix="/annoscaling")
tags = ["annoscaling"]

ass: AnnoScalingService = AnnoScalingService()


@router.post(
    "",
    tags=tags,
    summary="Returns the CrawlerJob for the given Parameters",
    description="Returns the CrawlerJob for the given Parameters",
)
async def start_crawler_job(
    *, project_id: int, user_ids: List[int], code_id: int
) -> List[str]:
    return ass.suggest(project_id, user_ids, code_id)
