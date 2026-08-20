from datetime import UTC, datetime
from typing import Generator

from fastapi import Depends, HTTPException, Query
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


def skip_limit_params(
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


def get_db_session() -> Generator[Session, None, None]:
    with SQLRepo().transaction() as db:
        yield db


def get_weaviate_client() -> WeaviateClient:
    return WeaviateRepo().get_client()


def get_current_user(
    db: Session = Depends(get_db_session), token: str = Depends(reusable_oauth2_scheme)
) -> UserORM:
    if token.startswith("dats_"):
        hashed_token = hash_api_key(token)
        db_key = crud_api_key.get_by_hashed_key(db=db, hashed_key=hashed_token)

        if not db_key:
            raise credentials_exception

        if db_key.expires_at and db_key.expires_at < datetime.now(UTC):
            raise HTTPException(status_code=401, detail="API Key has expired")

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

    if user is None:
        raise credentials_exception
    return user
