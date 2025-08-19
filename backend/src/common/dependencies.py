from typing import AsyncGenerator

from fastapi import Depends, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from weaviate import WeaviateClient

from config import conf
from core.auth.auth_exceptions import credentials_exception
from core.auth.security import decode_jwt
from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from repos.db.sql_repo import SQLRepo
from repos.vector.weaviate_repo import WeaviateRepo

# instantiate here to so that it is reusable for consecutive calls
reusable_oauth2_scheme = OAuth2PasswordBearer(tokenUrl=conf.api.auth.jwt.token_url)


async def skip_limit_params(
    skip: int | None = Query(
        title="Skip",
        description="The number of elements to skip (offset)",
        ge=0,
        le=10e6,
        default=None,
    ),
    limit: int | None = Query(
        title="Limit",
        description="The maximum number of returned elements",
        ge=1,
        le=1000,
        default=None,
    ),
) -> dict[str, int]:
    result = {}
    if skip is not None:
        result["skip"] = skip
    if limit is not None:
        result["limit"] = limit

    return result


async def get_db_session() -> AsyncGenerator[Session, None]:
    session = SQLRepo().session_maker()
    try:
        yield session
    finally:
        if session is not None:
            session.close()


async def get_weaviate_session() -> AsyncGenerator[WeaviateClient, None]:
    session = WeaviateRepo().weaviate_session()
    try:
        yield session
    finally:
        if session is not None:
            session.close()


def get_current_user(
    db: Session = Depends(get_db_session), token: str = Depends(reusable_oauth2_scheme)
) -> UserORM:
    try:
        payload = decode_jwt(token=token)
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except (JWTError, ValidationError):
        raise credentials_exception

    user = crud_user.read_by_email(db=db, email=email)

    if user is None:
        raise credentials_exception
    return user
