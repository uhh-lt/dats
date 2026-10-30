from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.auth.security import verify_password
from core.user.user_crud import crud_user
from core.user.user_dto import UserLogin, UserRead
from repos.db.sql_exceptions import NoSuchElementError


class AuthService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(AuthService, cls).__new__(cls)

    def authenticate(self, db: Session, *, user_login: UserLogin) -> UserRead | None:
        try:
            user = crud_user.read_by_email(db=db, email=user_login.username)
        except NoSuchElementError:
            # Don't tell users if the email or the password was wrong
            # to prevent email guessing attacks
            return None

        # Virtual annotators have no password and can never log in
        if user.is_virtual or user.password is None:
            return None

        if not verify_password(
            plain_password=user_login.password, hashed_password=user.password
        ):
            return None
        return UserRead.model_validate(user)
