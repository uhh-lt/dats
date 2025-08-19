import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session, reusable_oauth2_scheme
from core.auth.auth_exceptions import credentials_exception
from core.auth.authz_user import AuthzUser
from core.auth.oauth_service import OAuthService
from core.auth.refresh_token_crud import crud_refresh_token
from core.auth.refresh_token_dto import RefreshAccessTokenData
from core.auth.security import decode_jwt, generate_jwt
from core.user.user_crud import crud_user
from core.user.user_dto import (
    UserAuthorizationHeaderData,
    UserCreate,
    UserLogin,
    UserRead,
)
from core.user.user_orm import UserORM
from repos.db.crud_base import NoSuchElementError
from repos.mail_repo import MailRepo

CONTENT_PREFIX = "/content/projects/"
AUTHORIZATION = "Authorization"

oauth_service = OAuthService()

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
    await MailRepo().send_welcome_mail(
        email=db_user.email, first_name=db_user.first_name, last_name=db_user.last_name
    )
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
    refresh_token = crud_refresh_token.create(db, user.id)

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
    *,
    db: Session = Depends(get_db_session),
    dto: RefreshAccessTokenData = Depends(),
    response: Response,
) -> UserAuthorizationHeaderData:
    token = crud_refresh_token.read_and_verify(db, dto.refresh_token)
    crud_refresh_token.revoke(db, token)
    # Remove very old refresh tokens to prevent our database from filling up
    crud_refresh_token.delete_old_refresh_tokens(db, token.user_id)

    (access_token, access_token_expires) = generate_jwt(token.user)
    new_token = crud_refresh_token.create(db, token.user.id)

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


@router.get("/oidc/login")
async def oidc_login(request: Request, redirect_uri: str) -> Response:
    if not oauth_service.is_enabled:
        raise HTTPException(
            status_code=404, detail="OIDC authentication is not enabled"
        )
    return await oauth_service.authentik.authorize_redirect(request, redirect_uri)


@router.get("/oidc/callback")
async def oidc_callback(
    request: Request, response: Response, db: Session = Depends(get_db_session)
):
    if not oauth_service.is_enabled:
        raise HTTPException(
            status_code=404, detail="OIDC authentication is not enabled"
        )

    try:
        user = await oauth_service.authenticate_oidc(request)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

    (access_token, access_token_expires) = generate_jwt(user)
    refresh_token = crud_refresh_token.create(db, user.id)

    auth_data = UserAuthorizationHeaderData(
        access_token=access_token,
        access_token_expires=access_token_expires,
        token_type="bearer",
        refresh_token=refresh_token.token,
        refresh_token_expires=refresh_token.expires_at,
    )

    # Properly encode the data as JSON
    json_str = json.dumps(jsonable_encoder({"token": auth_data.model_dump()}))

    # Return HTML with proper content type that closes the window and sends the token to the parent
    html_content = f"""
        <html>
            <head>
                <script>
                    try {{
                        const data = {json_str};
                        window.opener.postMessage(data, "*");
                    }} catch (e) {{
                        console.error("Failed to process authentication data:", e);
                    }}
                </script>
            </head>
            <body>
                <p>Login successful! This window should close automatically...</p>
            </body>
        </html>
    """
    return HTMLResponse(content=html_content, media_type="text/html")


@router.post("/sync-session")
async def sync_session(
    response: Response,
    current_user: UserORM = Depends(get_current_user),
    token: str = Depends(reusable_oauth2_scheme),
) -> None:
    payload = decode_jwt(token=token)
    expire: str | None = payload.get("exp")
    if expire is None:
        raise ValueError("Expiration time not found in token payload")

    response.set_cookie(
        AUTHORIZATION,
        token,
        expires=expire,
        secure=True,
        httponly=True,
        samesite="strict",
    )
