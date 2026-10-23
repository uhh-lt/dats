from sqlalchemy import select
from sqlalchemy.orm import Session

from core.auth.api_key_dto import ApiKeyCreate
from core.auth.api_key_orm import ApiKeyORM
from repos.db.crud_base import SQLCRUDBase, UpdateNotAllowed


class CRUDApiKey(SQLCRUDBase[ApiKeyORM, ApiKeyCreate, UpdateNotAllowed]):
    ### CREATE OPERATIONS ###
    # Inherited from SQLCRUDBase

    ### READ OPERATIONS ###

    def read_if_exists(self, db: Session, *, id: int) -> ApiKeyORM | None:
        return db.execute(
            select(self.model).where(self.model.id == id)
        ).scalar_one_or_none()

    def read_by_user(self, db: Session, *, user_id: int) -> list[ApiKeyORM]:
        return list(
            db.execute(select(self.model).where(self.model.user_id == user_id))
            .scalars()
            .all()
        )

    def read_by_hashed_key(self, db: Session, *, hashed_key: str) -> ApiKeyORM | None:
        return db.execute(
            select(self.model).where(self.model.hashed_key == hashed_key)
        ).scalar_one_or_none()


crud_api_key = CRUDApiKey(ApiKeyORM)
