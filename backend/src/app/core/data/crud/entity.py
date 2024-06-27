from typing import List

from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.span_text_entity_link import crud_span_text_entity_link
from app.core.data.dto.entity import (
    EntityCreate,
    EntityUpdate,
)
from app.core.data.dto.span_text_entity_link import (
    SpanTextEntityLinkCreate,
)
from app.core.data.orm.entity import EntityORM
from app.core.data.orm.span_text_entity_link import SpanTextEntityLinkORM


class CRUDEntity(CRUDBase[EntityORM, EntityCreate, EntityUpdate]):
    def create(
        self, db: Session, *, create_dto: EntityCreate, force: bool = True
    ) -> EntityORM:
        result = self.create_multi(db=db, create_dtos=[create_dto], force=force)
        return result[0] if len(result) > 0 else None

    def create_multi(
        self, db: Session, *, create_dtos: List[EntityCreate], force: bool = True
    ) -> List[EntityORM]:
        if len(create_dtos) == 0:
            return []
        dto_objs_data = [
            jsonable_encoder(dto, exclude={"span_text_ids"}) for dto in create_dtos
        ]
        db_objs = [self.model(**data) for data in dto_objs_data]
        db.add_all(db_objs)
        db.flush()
        db.commit()

        links = []
        for db_obj, create_dto in zip(db_objs, create_dtos):
            for span_text_id in create_dto.span_text_ids:
                links.append(
                    SpanTextEntityLinkCreate(
                        linked_entity_id=db_obj.id, linked_span_text_id=span_text_id
                    )
                )
        crud_span_text_entity_link.create_multi(db=db, create_dtos=links, force=force)
        db.commit()
        self.remove_all_unused_entites(db=db)
        return db_objs

    def read_by_project(self, db: Session, proj_id: int) -> List[EntityORM]:
        return db.query(self.model).filter(self.model.project_id == proj_id).all()

    def remove_multi(self, db: Session, *, ids: List[int]) -> List[EntityORM]:
        removed = db.query(EntityORM).filter(EntityORM.id.in_(ids)).all()
        db.query(EntityORM).filter(EntityORM.id.in_(ids)).delete(
            synchronize_session=False
        )
        db.commit()
        return removed

    def remove_all_unused_entites(self, db: Session) -> List[EntityORM]:
        subquery = select(SpanTextEntityLinkORM.linked_entity_id).distinct().subquery()
        query = (
            db.query(EntityORM)
            .outerjoin(subquery, EntityORM.id == subquery.c.linked_entity_id)
            .filter(subquery.c.linked_entity_id.is_(None))
        )
        to_remove = query.all()
        return self.remove_multi(db=db, ids=[e.id for e in to_remove])


crud_entity = CRUDEntity(EntityORM)
