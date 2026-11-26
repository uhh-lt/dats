from datetime import UTC, datetime
from typing import Annotated, Generator

from fastapi import Depends, HTTPException, Request, WebSocket
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from weaviate import WeaviateClient

from config import conf
from core.auth.api_key_crud import crud_api_key
from core.auth.auth_exceptions import credentials_exception
from core.auth.security import decode_jwt, hash_api_key
from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from repos.db.sql_repo import SQLRepo
from repos.vector.weaviate_repo import WeaviateRepo

# instantiate here to so that it is reusable for consecutive calls
reusable_oauth2_scheme = OAuth2PasswordBearer(tokenUrl=conf.auth.jwt.token_url)


def get_db_session() -> Generator[Session, None, None]:
    """Provides a transactional SQLAlchemy database session for the duration of a request."""
    with SQLRepo().transaction() as db:
        yield db


# Function scope commits the transaction right after the path operation (and its
# response serialization) returns, i.e. before the response is sent and before
# background tasks (websocket events) run. With the default request scope, the
# commit would happen after both, so a client could read stale data and a failing
# background task would roll back the request.
DBSession = Annotated[Session, Depends(get_db_session, scope="function")]


def get_weaviate_client() -> WeaviateClient:
    """Provides a Weaviate vector database client."""
    return WeaviateRepo().get_client()


def resolve_user(request: Request | WebSocket, db: Session, token: str) -> UserORM:
    """Resolves a token (API key or JWT) to the corresponding user, raising 401 if invalid."""
    if token.startswith("dats_"):
        hashed_token = hash_api_key(token)
        db_key = crud_api_key.read_by_hashed_key(db=db, hashed_key=hashed_token)

        if not db_key:
            raise credentials_exception

        if db_key.expires_at and db_key.expires_at < datetime.now(UTC):
            raise HTTPException(status_code=401, detail="API Key has expired")

        # virtual users can never log in, so they can never use a key either
        if db_key.user.is_virtual:
            raise credentials_exception

        # Record the auth method so downstream code (e.g. sync-event actor
        # exclusion) can tell API-key mutations apart from human (JWT) ones.
        request.state.auth_method = "api_key"
        return db_key.user
    try:
        payload = decode_jwt(token=token)
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except (
        InvalidTokenError,
        ValidationError,
    ):
        raise credentials_exception

    user = crud_user.read_by_email(db=db, email=email)

    if user is None or user.is_virtual:
        raise credentials_exception
    request.state.auth_method = "jwt"
    return user


def get_current_user(
    request: Request,
    db: DBSession,
    token: str = Depends(reusable_oauth2_scheme),
) -> UserORM:
    """Authenticates the current user via the Authorization Bearer header (API key or JWT)."""
    return resolve_user(request, db, token)


def get_current_user_from_cookie(
    request: Request,
    db: DBSession,
) -> UserORM:
    """Authenticates the current user via the Authorization cookie."""
    token = request.cookies.get("Authorization")
    if not token:
        raise credentials_exception
    return resolve_user(request, db, token)
