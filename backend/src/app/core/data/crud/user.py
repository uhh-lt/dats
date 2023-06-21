from typing import Optional

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.user import UserCreate, UserLogin, UserUpdate
from app.core.data.orm.user import UserORM
from app.core.security import generate_password_hash, verify_password

SYSTEM_USER_ID: int = 1


class CRUDUser(CRUDBase[UserORM, UserCreate, UserUpdate]):
    def create(self, db: Session, *, create_dto: UserCreate) -> UserORM:
        # Flo: hashes the PW before storing in DB
        hashed_pwd = generate_password_hash(create_dto.password)
        create_dto.password = hashed_pwd
        return super().create(db=db, create_dto=create_dto)

    def update(
        self, db: Session, *, id: int, update_dto: UserUpdate
    ) -> Optional[UserORM]:
        # Flo: hashes the PW before storing in DB
        if update_dto.password:
            hashed_pwd = generate_password_hash(update_dto.password)
            update_dto.password = hashed_pwd
        return super().update(db=db, id=id, update_dto=update_dto)

    def read_by_email(self, db: Session, *, email: str) -> Optional[UserORM]:
        # Flo: email is unique so there can be only one, which is why we use first() here
        return db.query(self.model).filter(self.model.email == email).first()

    def authenticate(self, db: Session, user_login: UserLogin) -> Optional[UserORM]:
        user = self.read_by_email(db=db, email=user_login.username)
        if not user:
            return None
        if not verify_password(
            plain_password=user_login.password, hashed_password=user.password
        ):
            return None
        return user


crud_user = CRUDUser(UserORM)
