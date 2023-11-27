from typing import Annotated, Any, AsyncGenerator, Dict, Optional

from app.core.authorization.authorization_service import (
    AuthorizationCheck,
    AuthorizationService,
)
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.user import crud_user
from app.core.data.dto.action import ActionType
from app.core.data.dto.user import UserRead
from app.core.data.orm.user import UserORM
from app.core.db.sql_service import SQLService
from app.core.security import decode_jwt
from config import conf
from fastapi import Depends, Query, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from api.util import credentials_exception

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
    result = {}
    if skip is not None:
        result["skip"] = skip
    if limit is not None:
        result["limit"] = limit

    return result


async def resolve_code_param(
    resolve: bool = Query(
        title="Resolve Code",
        description="If true, the current_code_id of the"
        " SpanAnnotation gets resolved and replaced"
        " by the respective Code entity",
        default=True,
    ),
) -> bool:
    return resolve


async def get_db_session() -> AsyncGenerator[Session, None]:
    session = SQLService().session_maker()
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
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
    except (JWTError, ValidationError):
        raise credentials_exception

    user = crud_user.read_by_email(db=db, email=email)

    if user is None:
        raise credentials_exception
    return user


# A convenience type alias for depending `get_current_user` in endpoints
AuthenticatedUser = Annotated[UserRead, Depends(get_current_user)]


def is_authorized(
    action: ActionType,
    crud_object: CRUDBase,
    param_key: Optional[str] = None,
) -> Any:
    def f(request: Request, user: UserRead = Depends(get_current_user)):
        object_id = (
            int(request.path_params[param_key]) if param_key is not None else None
        )
        AuthorizationService().check_authorization(
            subject=user,
            check=AuthorizationCheck(action, crud_object, object_id),
        )

    return Depends(f)
