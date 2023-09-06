from typing import List, Optional

from api.dependencies import get_db_session
from app.core.data.crud.user import crud_user
from app.core.data.dto.feedback import FeedbackCreate, FeedbackRead
from app.core.data.dto.user import UserRead
from app.core.db.redis_service import RedisService
from app.core.mail.mail_service import MailService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/feedback")
tags = ["feedback"]


@router.put(
    "",
    tags=tags,
    response_model=Optional[FeedbackRead],
    summary="Creates new Feedback",
    description="Creates a new Feedback and returns it with the generated ID.",
)
async def create_feedback(
    *, db: Session = Depends(get_db_session), feedback: FeedbackCreate
) -> Optional[FeedbackRead]:
    fb = RedisService().store_feedback(feedback=feedback)

    user = crud_user.read(db=db, id=feedback.user_id)
    await MailService().send_feedback_received_mail(
        user=UserRead.from_orm(user),
        feedback=feedback,
    )
    return fb


@router.get(
    "/{feedback_id}",
    tags=tags,
    response_model=Optional[FeedbackRead],
    summary="Returns the Feedback",
    description="Returns the Feedback with the given ID.",
)
async def get_by_id(*, feedback_id: str) -> Optional[FeedbackRead]:
    return RedisService().load_feedback(key=feedback_id)


@router.get(
    "",
    tags=tags,
    response_model=Optional[List[FeedbackRead]],
    summary="Returns all Feedback",
    description="Returns the Metadata with the given ID.",
)
async def get_all() -> Optional[List[FeedbackRead]]:
    return RedisService().get_all_feedbacks()


@router.get(
    "/user/{user_id}",
    tags=tags,
    response_model=Optional[List[FeedbackRead]],
    summary="Returns all Feedback of a User",
    description="Returns the Metadata of the User with the given ID.",
)
async def get_all_by_user(*, user_id: int) -> Optional[List[FeedbackRead]]:
    return RedisService().get_all_feedbacks_of_user(user_id)


@router.post(
    "/reply_to/{feedback_id}",
    tags=tags,
    response_model=str,
    summary="Reply to the Feedback",
    description="Sends an e-mail to the User that created the Feedback with the given message.",
)
async def reply_to(
    *, db: Session = Depends(get_db_session), feedback_id: str, message: str
) -> str:
    # todo: load_feedback should raise exception, if it does not exist!
    feedback: Optional[FeedbackRead] = RedisService().load_feedback(key=feedback_id)

    user = crud_user.read(db=db, id=feedback.user_id)

    await MailService().send_feedback_response_mail(
        user=UserRead.from_orm(user),
        feedback=feedback,
        message=message,
    )
    return "email has been sent"
