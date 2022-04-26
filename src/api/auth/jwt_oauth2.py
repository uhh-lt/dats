import binascii
import os
from datetime import datetime, timedelta
from typing import Dict, Optional

from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from jose import jwt
from loguru import logger
from sqlalchemy.orm import Session
from starlette import status

from app.core.data.crud.user import crud_user
from app.core.data.dto.user import UserRead, UserLogin
from app.core.db.sql_service import SQLService
from app.core.security.password import verify_password
from config import conf

__algo = conf.api.auth.jwt.algo
__ttl = int(conf.api.auth.jwt.ttl)
__jwt_secret = conf.api.auth.jwt.secret

credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

if not __jwt_secret or __jwt_secret == '':
    logger.warning('JWT Secret not provided! Generating 32 bit secret')
    __secret = binascii.hexlify(os.urandom(32))
else:
    __secret = conf.api.auth.jwt_secret

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=conf.api.auth.jwt.token_url)


def generate_jwt(user: UserRead) -> str:
    expire = datetime.utcnow() + timedelta(seconds=__ttl)
    payload = {
        'sub': user.email,
        'type': 'access_token',
        'iat': datetime.utcnow(),
        'exp': expire
    }
    logger.debug(f"Generated JWT for {user.email} that expires at {expire}!")
    token = jwt.encode(payload, __jwt_secret, algorithm=__algo)
    return token


def __decode_jwt(token: str) -> Optional[Dict]:
    try:
        decoded = jwt.decode(token,
                             __jwt_secret,
                             algorithms=__algo,
                             options={"verify_aud": False})
        return decoded
    except Exception as e:
        logger.error(f"Cannot decode JWT! Exception: {e}")
        raise e


def authenticate(db: Session, user_login: UserLogin) -> Optional[UserRead]:
    user = crud_user.read_by_email(db=db, email=user_login.username)
    if not user:
        return None
    if not verify_password(plain_password=user_login.password,
                           hashed_password=user.password):
        return None
    return user


async def current_user(token: str = Depends(oauth2_scheme)) -> UserRead:
    try:
        payload = __decode_jwt(token=token)
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except (JWTError, Exception) as e:
        raise credentials_exception

    with SQLService().db_session() as db:
        user = crud_user.read_by_email(db=db, email=email)

    if user is None:
        raise credentials_exception
    return user
