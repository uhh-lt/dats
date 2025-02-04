from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from api.util import credentials_exception
from app.core.authorization.authz_user import AuthzUser
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

CONTENT_PREFIX = "/content/projects/"
AUTHORIZATION = "Authorization"

router = APIRouter(prefix="/authentication", tags=["authentication"])


@router.post(
    "/register",
    response_model=UserRead,
    summary="Registers a new User and returns it with the generated ID.",
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
    summary=(
        "Returns the JWT access token for the provided user login data if the login was successful. "
        "This is usually only called from an OAuth2 client!"
    ),
)
def login(
    *,
    db: Session = Depends(get_db_session),
    user_login_form_data: OAuth2PasswordRequestForm = Depends(),
    response: Response,
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

    response.set_cookie(
        AUTHORIZATION,
        access_token,
        expires=access_token_expires,
        secure=True,
        httponly=True,
        samesite="strict",
    )

    return UserAuthorizationHeaderData(
        access_token=access_token,
        access_token_expires=access_token_expires,
        token_type="bearer",
        refresh_token=refresh_token.token,
        refresh_token_expires=refresh_token.expires_at,
    )


@router.post(
    "/logout",
    summary="Revokes the refresh token associated with the given session.",
)
def logout(
    *,
    db: Session = Depends(get_db_session),
    dto: RefreshAccessTokenData = Depends(),
    response: Response,
) -> None:
    token = crud_refresh_token.read_and_verify(db, dto.refresh_token)
    crud_refresh_token.revoke(db, token)
    response.delete_cookie(AUTHORIZATION, secure=True, httponly=True, samesite="strict")


@router.post(
    "/refresh_access",
    summary="Uses the given refresh token to obtain a new access token.",
)
def refresh_access_token(
    *, db: Session = Depends(get_db_session), dto: RefreshAccessTokenData = Depends()
) -> UserAuthorizationHeaderData:
    token = crud_refresh_token.read_and_verify(db, dto.refresh_token)
    crud_refresh_token.revoke(db, token)
    # Remove very old refresh tokens to prevent our database from filling up
    crud_refresh_token.remove_old_refresh_tokens(db, token.user_id)

    (access_token, access_token_expires) = generate_jwt(token.user)
    new_token = crud_refresh_token.generate(db, token.user.id)
    return UserAuthorizationHeaderData(
        access_token=access_token,
        access_token_expires=access_token_expires,
        refresh_token=new_token.token,
        token_type="bearer",
        refresh_token_expires=new_token.expires_at,
    )


@router.get(
    "/content",
    summary="Returns success if the user can access the content",
)
async def auth_content(
    request: Request,
    db: Session = Depends(get_db_session),
    x_original_uri: Annotated[str | None, Header()] = None,
) -> None:
    # returns None on purpose
    token = request.cookies[AUTHORIZATION]
    a = AuthzUser(request, get_current_user(db, token), db)
    if x_original_uri is None or not x_original_uri.startswith(CONTENT_PREFIX):
        return

    index = x_original_uri.find("/", len(CONTENT_PREFIX))
    project = int(x_original_uri[len(CONTENT_PREFIX) : index])
    a.assert_in_project(project)
