from typing import Any, Dict, List, Optional

import srsly
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.span_text_entity_link import (
    SpanTextEntityLinkCreate,
    SpanTextEntityLinkUpdate,
)
from app.core.data.orm.entity import EntityORM
from app.core.data.orm.span_text_entity_link import SpanTextEntityLinkORM
from config import conf

# we need:
# create
# update
# delete
# read:
# by id, we can define the rest as it is needed


class CRUDSpanTextEntityLink(
    CRUDBase[SpanTextEntityLinkORM, SpanTextEntityLinkCreate, SpanTextEntityLinkCreate]
):
    def create(
        self, db: Session, *, create_dto: SpanTextEntityLinkCreate
    ) -> SpanTextEntityLinkORM:
        dto_obj_data = jsonable_encoder(create_dto)
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        return db_obj

    def update(
        self, db: Session, *, id: int, update_dto: SpanTextEntityLinkUpdate
    ) -> SpanTextEntityLinkUpdate:
        return super().update(db, id=id, update_dto=update_dto)

    def read_by_span_text_id_and_project_id(
        self, db: Session, *, span_text_id: int, project_id: int
    ) -> SpanTextEntityLinkORM:
        return (
            db.query(SpanTextEntityLinkORM)
            .filter(SpanTextEntityLinkORM.linked_span_text_id == span_text_id)
            .join(EntityORM, SpanTextEntityLinkORM.linked_entity_id == EntityORM.id)
            .filter(
                EntityORM.project_id == project_id,
            )
            .first()
        )


crud_span_text_entity_link = CRUDSpanTextEntityLink(SpanTextEntityLinkORM)
