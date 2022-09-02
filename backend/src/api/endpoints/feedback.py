from typing import List, Optional
from fastapi import APIRouter
from app.core.data.dto.feedback import FeedbackRead, FeedbackCreate
from app.core.db.redis_service import RedisService

router = APIRouter(prefix="/feedback")
tags = ["feedback"]


@router.put("", tags=tags,
            response_model=Optional[FeedbackRead],
            summary="Creates new Feedback",
            description="Creates a new Feedback and returns it with the generated ID.")
async def create_feedback(*,
                          feedback: FeedbackCreate) -> Optional[FeedbackRead]:
    return RedisService().store_feedback(feedback=feedback)


@router.get("/{feedback_id}", tags=tags,
            response_model=Optional[FeedbackRead],
            summary="Returns the Feedback",
            description="Returns the Feedback with the given ID.")
async def get_by_id(*,
                    feedback_id: str) -> Optional[FeedbackRead]:
    return RedisService().load_feedback(key=feedback_id)


@router.get("", tags=tags,
            response_model=Optional[List[FeedbackRead]],
            summary="Returns all Feedback",
            description="Returns the Metadata with the given ID.")
async def get_all() -> Optional[List[FeedbackRead]]:
    return RedisService().get_all_feedbacks()
