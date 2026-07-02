import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from loguru import logger

from config import conf
from core.user.user_orm import UserORM

__algo = conf.auth.jwt.algo
__access_ttl = conf.auth.jwt.access_ttl
__jwt_secret = conf.auth.jwt.secret

# =====================================================================
# Password Hashing (Zero Dependency Passlib-Compatible Layer)
# =====================================================================


def _ab64_decode(data: str) -> bytes:
    """Decodes passlib's custom 'adapted base64' format."""
    data = data.replace(".", "+")
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    return base64.b64decode(data)


def _ab64_encode(data: bytes) -> str:
    """Encodes bytes into passlib's custom 'adapted base64' format."""
    return base64.b64encode(data).decode("ascii").rstrip("=").replace("+", ".")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies existing passlib pbkdf2-sha256 hashes from the database."""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 5 or parts[1] != "pbkdf2-sha256":
            return False

        iterations = int(parts[2])
        salt_bytes = _ab64_decode(parts[3])
        hash_bytes = _ab64_decode(parts[4])

        # Calculate the hash of the login attempt
        calculated_hash = hashlib.pbkdf2_hmac(
            "sha256", plain_password.encode("utf-8"), salt_bytes, iterations
        )

        # Use hmac.compare_digest to prevent timing attacks!
        return hmac.compare_digest(calculated_hash, hash_bytes)
    except Exception:
        return False


def generate_password_hash(password: str, iterations: int = 600000) -> str:
    """Generates new hashes perfectly compatible with your legacy DB format."""
    salt_bytes = secrets.token_bytes(16)
    hash_bytes = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt_bytes, iterations
    )
    salt_b64 = _ab64_encode(salt_bytes)
    hash_b64 = _ab64_encode(hash_bytes)
    return f"$pbkdf2-sha256${iterations}${salt_b64}${hash_b64}"


# =====================================================================
# JWT and Tokens
# =====================================================================


def generate_jwt(user: UserORM) -> tuple[str, datetime]:
    expire = datetime.now(UTC) + timedelta(seconds=__access_ttl)

    payload = {
        "sub": user.email,
        "type": "access_token",
        "iat": datetime.now(UTC),
        "exp": expire,
    }
    logger.debug(f"Generated JWT for {user.email} that expires at {expire}!")

    token = jwt.encode(payload, __jwt_secret, algorithm=__algo)
    return (token, expire)


def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            __jwt_secret,
            algorithms=[__algo],
            options={"verify_aud": False},
        )

    except Exception as e:
        logger.error(f"Cannot decode JWT! Exception: {e}")
        raise e


# Since request tokens are stored in the DB, we don't need to use JWT for them.
def generate_refresh_token() -> str:
    return secrets.token_urlsafe()
