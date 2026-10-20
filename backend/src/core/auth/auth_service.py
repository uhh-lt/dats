from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.auth.security import verify_password
from core.user.user_crud import crud_user
from core.user.user_dto import UserLogin
from core.user.user_orm import UserORM
from repos.db.sql_exceptions import NoSuchElementError


class AuthService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(AuthService, cls).__new__(cls)

    def authenticate(self, db: Session, *, user_login: UserLogin) -> UserORM | None:
        try:
            user = crud_user.read_by_email(db=db, email=user_login.username)
        except NoSuchElementError:
            # Don't tell users if the email or the password was wrong
            # to prevent email guessing attacks
            return None

        if not verify_password(
            plain_password=user_login.password, hashed_password=user.password
        ):
            return None
        return user
