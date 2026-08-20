from datetime import UTC, datetime
from typing import Never

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.auth.api_key_dto import ApiKeyCreate, ApiKeyRead
from core.auth.api_key_orm import ApiKeyORM
from repos.db.crud_base import CRUDBase


class CRUDApiKey(CRUDBase[ApiKeyORM, ApiKeyCreate, Never]):
    def create(
        self,
        db: Session,
        *,
        user_id: int,
        name: str,
        hashed_key: str,
        prefix: str,
        expires_at: datetime | None = None,
    ) -> ApiKeyORM:
        dto = ApiKeyCreate(
            name=name,
            prefix=prefix,
            hashed_key=hashed_key,
            expires_at=expires_at,
            created_at=datetime.now(UTC),
            user_id=user_id,
        )
        return super().create(db, create_dto=dto)

    def get_by_id(self, db: Session, *, key_id: int) -> ApiKeyORM | None:
        return db.execute(
            select(self.model).where(self.model.id == key_id)
        ).scalar_one_or_none()

    def get_multi_by_user(self, db: Session, *, user_id: int) -> list[ApiKeyRead]:
        orm_keys = (
            db.execute(select(self.model).where(self.model.user_id == user_id))
            .scalars()
            .all()
        )
        return [ApiKeyRead.model_validate(key) for key in orm_keys]

    def get_by_hashed_key(self, db: Session, *, hashed_key: str) -> ApiKeyORM | None:
        return db.execute(
            select(self.model).where(self.model.hashed_key == hashed_key)
        ).scalar_one_or_none()


crud_api_key = CRUDApiKey(ApiKeyORM)
