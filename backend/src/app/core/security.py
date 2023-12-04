import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional

from jose import jwt
from loguru import logger
from passlib.context import CryptContext

from app.core.data.orm.user import UserORM
from config import conf

__password_ctx = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

__algo = conf.api.auth.jwt.algo
__access_ttl = int(conf.api.auth.jwt.access_ttl)
__jwt_secret = conf.api.auth.jwt.secret


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return __password_ctx.verify(plain_password, hashed_password)


def generate_password_hash(password: str) -> str:
    return __password_ctx.hash(password)


def generate_jwt(user: UserORM) -> str:
    expire = datetime.utcnow() + timedelta(seconds=__access_ttl)

    payload = {
        "sub": user.email,
        "type": "access_token",
        "iat": datetime.utcnow(),
        "exp": expire,
    }
    logger.debug(f"Generated JWT for {user.email} that expires at {expire}!")
    token = jwt.encode(payload, __jwt_secret, algorithm=__algo)
    return token


def decode_jwt(token: str) -> Optional[Dict]:
    try:
        return jwt.decode(
            token, __jwt_secret, algorithms=__algo, options={"verify_aud": False}
        )

    except Exception as e:
        logger.error(f"Cannot decode JWT! Exception: {e}")
        raise e


# Since request tokens are stored in the DB, we don't need to use JWT
# for them.
def genereate_refresh_token() -> str:
    return secrets.token_urlsafe()
