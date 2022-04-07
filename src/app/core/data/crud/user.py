from typing import List

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.user import UserCreate, UserUpdate
from app.core.data.orm.code import CodeORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.user import UserORM

SYSTEM_USER_ID: int = 1


class CRUDUser(CRUDBase[UserORM, UserCreate, UserUpdate]):
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


crud_user = CRUDUser(UserORM)
