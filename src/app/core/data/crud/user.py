from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.user import UserCreate, UserUpdate
from app.core.data.orm.code import CodeORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.user import UserORM

SYSTEM_USER_ID: int = 1


class CRUDUser(CRUDBase[UserORM, UserCreate, UserUpdate]):
    def remove_all_codes(self, db: Session, *, id: int) -> UserORM:
        db_obj = self.read(db=db, id=id)
        statement = delete(CodeORM).where(CodeORM.user_id == db_obj.id)
        db.execute(statement)
        db.commit()
        return db_obj

    def remove_all_memos(self, db: Session, *, id: int) -> UserORM:
        db_obj = self.read(db=db, id=id)
        statement = delete(MemoORM).where(MemoORM.user_id == db_obj.id)
        db.execute(statement)
        db.commit()
        return db_obj


crud_user = CRUDUser(UserORM)
