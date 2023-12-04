from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from api.util import credentials_exception
from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.crud.refresh_token import crud_refresh_token
from app.core.data.crud.user import crud_user
from app.core.data.dto.refresh_token import RefreshAccessTokenData
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
) -> UserRead:
    try:
        db_user = crud_user.read_by_email(db, email=user.email)
    except NoSuchElementError:
        db_user = None

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

    (access_token, access_token_expires) = generate_jwt(user)
    refresh_token = crud_refresh_token.generate(db, user.id)

    return UserAuthorizationHeaderData(
        access_token=access_token,
        access_token_expires=access_token_expires,
        token_type="bearer",
        refresh_token=refresh_token.token,
        refresh_token_expires=refresh_token.expires_at,
    )


@router.post(
    "/logout",
    summary="Log out the user from the given session.",
    description=("Revokes the refresh token associated with the given session."),
)
def logout(
    *, db: Session = Depends(get_db_session), dto: RefreshAccessTokenData = Depends()
):
    token = crud_refresh_token.read_and_verify(db, dto.refresh_token)
    crud_refresh_token.revoke(db, token)


@router.post(
    "/refresh_access",
    summary="Obtain a new access token.",
    description=("Uses the given refresh token to obtain a new access token."),
)
async def refresh_access_token(
    *, db: Session = Depends(get_db_session), dto: RefreshAccessTokenData = Depends()
) -> UserAuthorizationHeaderData:
    token = crud_refresh_token.read_and_verify(db, dto.refresh_token)
    crud_refresh_token.revoke(db, token)

    (access_token, access_token_expires) = generate_jwt(token.user)
    new_token = crud_refresh_token.generate(db, token.user.id)
    return UserAuthorizationHeaderData(
        access_token=access_token,
        access_token_expires=access_token_expires,
        refresh_token=new_token.token,
        token_type="bearer",
        refresh_token_expires=new_token.expires_at,
    )
