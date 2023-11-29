from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from api.util import credentials_exception
from app.core.data.crud.user import crud_user
from app.core.data.dto.user import (
    UserAuthorizationHeaderData,
    UserCreate,
    UserLogin,
    UserRead,
)
from app.core.mail.mail_service import MailService
from app.core.security import generate_jwt

router = APIRouter(prefix="/authentication", tags=["authentication"])


@router.post(
    "/register",
    response_model=UserRead,
    summary="Registers a new User",
    description="Registers a new User and returns it with the generated ID.",
)
async def register(
    *, db: Session = Depends(get_db_session), user: UserCreate
) -> Optional[UserRead]:
    db_user = crud_user.read_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )

    db_user = crud_user.create(db=db, create_dto=user)
    await MailService().send_welcome_mail(user=UserRead.model_validate(db_user))
    return UserRead.model_validate(db_user)


@router.post(
    "/login",
    response_model=UserAuthorizationHeaderData,
    summary="Returns the JWT access token for the provided user login data",
    description=(
        "Returns the JWT access token for the provided user login data if the login was successful. "
        "This is usually only called from an OAuth2 client!"
    ),
)
async def login(
    *,
    db: Session = Depends(get_db_session),
    user_login_form_data: OAuth2PasswordRequestForm = Depends(),
) -> UserAuthorizationHeaderData:
    user_login = UserLogin(
        username=user_login_form_data.username,
        password=user_login_form_data.password,
    )
    user = crud_user.authenticate(db=db, user_login=user_login)
    if not user:
        raise credentials_exception

    return UserAuthorizationHeaderData(
        access_token=generate_jwt(user), token_type="bearer"
    )
