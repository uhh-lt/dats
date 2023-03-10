from typing import Optional, Dict, Generator

from fastapi import Query, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from api.util import credentials_exception
from app.core.data.crud.user import crud_user
from app.core.data.dto.user import UserRead
from app.core.db.sql_service import SQLService
from app.core.security import decode_jwt
from config import conf

# instantiate here to so that it is reusable for consecutive calls
reusable_oauth2_scheme = OAuth2PasswordBearer(tokenUrl=conf.api.auth.jwt.token_url)


async def skip_limit_params(
    skip: Optional[int] = Query(
        title="Skip",
        description="The number of elements to skip (offset)",
        ge=0,
        le=10e6,
        default=None,
    ),
    limit: Optional[int] = Query(
        title="Limit",
        description="The maximum number of returned elements",
        ge=1,
        le=1000,
        default=None,
    ),
) -> Dict[str, int]:
    return {"skip": skip, "limit": limit}


async def resolve_code_param(
    resolve: Optional[bool] = Query(
        title="Resolve Code",
        description="If true, the current_code_id of the"
        " SpanAnnotation gets resolved and replaced"
        " by the respective Code entity",
        default=True,
    )
) -> bool:
    return resolve


async def get_db_session() -> Generator:
    try:
        session = SQLService().session_maker()
        yield session
    finally:
        session.close()


async def get_current_user(
    db: Session = Depends(get_db_session), token: str = Depends(reusable_oauth2_scheme)
) -> UserRead:
    try:
        payload = decode_jwt(token=token)
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except (JWTError, ValidationError) as e:
        raise credentials_exception

    user = crud_user.read_by_email(db=db, email=email)

    if user is None:
        raise credentials_exception
    return user
