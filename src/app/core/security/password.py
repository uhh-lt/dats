from passlib.context import CryptContext


__password_ctx = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return __password_ctx.verify(plain_password, hashed_password)


def generate_password_hash(password: str) -> str:
    return __password_ctx.hash(password)
