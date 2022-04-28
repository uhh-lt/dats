from typing import List, Optional

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.user import UserCreate, UserUpdate, UserLogin
from app.core.data.orm.code import CodeORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.user import UserORM
from app.core.security import verify_password, generate_password_hash

SYSTEM_USER_ID: int = 1


class CRUDUser(CRUDBase[UserORM, UserCreate, UserUpdate]):
    def create(self, db: Session, *, create_dto: UserCreate) -> UserORM:
        # Flo: hashes the PW before storing in DB
        hashed_pwd = generate_password_hash(create_dto.password)
        create_dto.password = hashed_pwd
        return super().create(db=db, create_dto=create_dto)

    def update(self, db: Session, *, id: int, update_dto: UserUpdate) -> Optional[UserORM]:
        # Flo: hashes the PW before storing in DB
        if update_dto.password:
            hashed_pwd = generate_password_hash(update_dto.password)
            update_dto.password = hashed_pwd
        return super().update(db=db, id=id, update_dto=update_dto)

    def remove_all_codes(self, db: Session, *, id: int) -> List[int]:
        db_obj = self.read(db=db, id=id)
        statement = delete(CodeORM).where(CodeORM.user_id == db_obj.id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        return list(map(lambda t: t[0], removed_ids))

    def remove_all_memos(self, db: Session, *, id: int) -> List[int]:
        db_obj = self.read(db=db, id=id)
        statement = delete(MemoORM).where(MemoORM.user_id == db_obj.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        return list(map(lambda t: t[0], removed_ids))

    def read_by_email(self, db: Session, *, email: str) -> Optional[UserORM]:
        # Flo: email is unique so there can be only one, which is why we use first() here
        return db.query(self.model).filter(self.model.email == email).first()

    def authenticate(self, db: Session, user_login: UserLogin) -> Optional[UserORM]:
        user = self.read_by_email(db=db, email=user_login.username)
        if not user:
            return None
        if not verify_password(plain_password=user_login.password,
                               hashed_password=user.password):
            return None
        return user


crud_user = CRUDUser(UserORM)
