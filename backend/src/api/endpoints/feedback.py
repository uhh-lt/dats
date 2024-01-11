from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud.user import SYSTEM_USER_ID, crud_user
from app.core.data.dto.feedback import FeedbackCreate, FeedbackRead
from app.core.data.dto.user import UserRead
from app.core.db.redis_service import RedisService
from app.core.mail.mail_service import MailService

router = APIRouter(
    prefix="/feedback", dependencies=[Depends(get_current_user)], tags=["feedback"]
)


@router.put(
    "",
    response_model=FeedbackRead,
    summary="Creates a new Feedback and returns it with the generated ID.",
)
async def create_feedback(
    *,
    db: Session = Depends(get_db_session),
    feedback: FeedbackCreate,
    authz_user: AuthzUser = Depends(),
) -> FeedbackRead:
    authz_user.assert_is_same_user(feedback.user_id)

    fb = RedisService().store_feedback(feedback=feedback)

    user = crud_user.read(db=db, id=feedback.user_id)
    await MailService().send_feedback_received_mail(
        user=UserRead.model_validate(user),
        feedback=fb,
    )
    return fb


@router.get(
    "/{feedback_id}",
    response_model=FeedbackRead,
    summary="Returns the Feedback with the given ID.",
)
def get_by_id(*, feedback_id: str, authz_user: AuthzUser = Depends()) -> FeedbackRead:
    feedback = RedisService().load_feedback(key=feedback_id)
    authz_user.assert_true(
        authz_user.user.id == SYSTEM_USER_ID or authz_user.user.id == feedback.user_id
    )

    return feedback


@router.get(
    "",
    response_model=List[FeedbackRead],
    summary="Returns all Feedback items of the current user. If logged in as the system user, return feedback of all users.",
)
def get_all(authz_user: AuthzUser = Depends()) -> List[FeedbackRead]:
    if authz_user.user.id == SYSTEM_USER_ID:
        return RedisService().get_all_feedbacks()
    else:
        return RedisService().get_all_feedbacks_of_user(authz_user.user.id)


@router.get(
    "/user/{user_id}",
    response_model=List[FeedbackRead],
    summary="Returns the Feedback of the User with the given ID.",
)
def get_all_by_user(
    *, user_id: int, authz_user: AuthzUser = Depends()
) -> List[FeedbackRead]:
    authz_user.assert_true(
        authz_user.user.id == SYSTEM_USER_ID or authz_user.user.id == user_id
    )
    return RedisService().get_all_feedbacks_of_user(user_id)


@router.post(
    "/reply_to/{feedback_id}",
    response_model=str,
    summary="Sends an e-mail to the User that created the Feedback with the given message.",
)
async def reply_to(
    *,
    db: Session = Depends(get_db_session),
    feedback_id: str,
    message: str,
    authz_user: AuthzUser = Depends(),
) -> str:
    authz_user.assert_is_same_user(SYSTEM_USER_ID)
    # todo: load_feedback should raise exception, if it does not exist!
    feedback: FeedbackRead = RedisService().load_feedback(key=feedback_id)

    user = crud_user.read(db=db, id=feedback.user_id)

    await MailService().send_feedback_response_mail(
        user=UserRead.model_validate(user),
        feedback=feedback,
        message=message,
    )
    return "email has been sent"
