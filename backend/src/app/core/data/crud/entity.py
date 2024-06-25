from typing import Any, Dict, List, Optional

import srsly
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.span_text import crud_span_text
from app.core.data.crud.span_text_entity_link import crud_span_text_entity_link
from app.core.data.dto.action import ActionType
from app.core.data.dto.entity import (
    EntityCreate,
    EntityMark,
    EntityMerge,
    EntityRead,
    EntityResolve,
    EntityUpdate,
)
from app.core.data.dto.span_text_entity_link import (
    SpanTextEntityLinkCreate,
    SpanTextEntityLinkUpdate,
)
from app.core.data.orm.entity import EntityORM
from config import conf


class CRUDEntity(CRUDBase[EntityORM, EntityCreate, EntityUpdate]):
    def create(self, db: Session, *, create_dto: EntityCreate) -> EntityORM:
        dto_obj_data = jsonable_encoder(create_dto, exclude={"span_text_ids"})
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.flush()
        for span_text_id in create_dto.span_text_ids:
            possible_link = (
                crud_span_text_entity_link.read_by_span_text_id_and_project_id(
                    db=db, span_text_id=span_text_id, project_id=create_dto.project_id
                )
            )
            if possible_link is not None:
                link = crud_span_text_entity_link.update(
                    db=db,
                    id=possible_link.id,
                    update_dto=SpanTextEntityLinkUpdate(
                        linked_entity_id=db_obj.id,
                        linked_span_text_id=possible_link.linked_span_text_id,
                    ),
                )
            else:
                link = crud_span_text_entity_link.create(
                    db=db,
                    create_dto=SpanTextEntityLinkCreate(
                        linked_entity_id=db_obj.id, linked_span_text_id=span_text_id
                    ),
                )
            db.add(link)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def create_multi(
        self, db: Session, *, create_dtos: List[EntityCreate]
    ) -> List[EntityORM]:
        db_objs = []
        for create_dto in create_dtos:
            dto_obj_data = jsonable_encoder(create_dto, exclude={"span_text_ids"})
            db_obj = self.model(**dto_obj_data)
            db.add(db_obj)
            db_objs.append(db_obj)
        db.flush()

        for db_obj, create_dto in zip(db_objs, create_dtos):
            for span_text_id in create_dto.span_text_ids:
                possible_link = (
                    crud_span_text_entity_link.read_by_span_text_id_and_project_id(
                        db=db,
                        span_text_id=span_text_id,
                        project_id=create_dto.project_id,
                    )
                )
                if possible_link is not None:
                    link = crud_span_text_entity_link.update(
                        db=db,
                        id=possible_link.id,
                        update_dto=SpanTextEntityLinkUpdate(
                            linked_entity_id=db_obj.id,
                            linked_span_text_id=possible_link.linked_span_text_id,
                        ),
                    )
                else:
                    link = crud_span_text_entity_link.create(
                        db=db,
                        create_dto=SpanTextEntityLinkCreate(
                            linked_entity_id=db_obj.id, linked_span_text_id=span_text_id
                        ),
                    )
                db.add(link)

        db.commit()
        return db_objs

    def mark(self, db: Session, *, mark_dto: EntityMark) -> EntityORM | None:
        span_text_link = crud_span_text_entity_link.read_by_span_text_id_and_project_id(
            db=db, span_text_id=mark_dto.span_text_id, project_id=mark_dto.project_id
        )
        if span_text_link is None:
            span_text = crud_span_text.read(db=db, id=mark_dto.span_text_id)
            entity_orm = self.create(
                db=db,
                create_dto=EntityCreate(
                    name=span_text.text,
                    project_id=mark_dto.project_id,
                    span_text_ids=[mark_dto.span_text_id],
                ),
            )
            return entity_orm
        return self.read(db=db, id=span_text_link.linked_entity_id)

    def mark_multi(
        self, db: Session, *, mark_dtos: List[EntityMark]
    ) -> List[EntityORM]:
        to_update = {}
        for entity_mark in mark_dtos:
            span_text_link = (
                crud_span_text_entity_link.read_by_span_text_id_and_project_id(
                    db=db,
                    span_text_id=entity_mark.span_text_id,
                    project_id=entity_mark.project_id,
                )
            )
            if span_text_link is None and entity_mark.span_text_id not in to_update:
                span_text = crud_span_text.read(db=db, id=entity_mark.span_text_id)
                to_update[entity_mark.span_text_id] = EntityCreate(
                    name=span_text.text,
                    project_id=entity_mark.project_id,
                    span_text_ids=[entity_mark.span_text_id],
                )
        return self.create_multi(db=db, create_dtos=to_update.values())

    def merge(self, db: Session, *, merge_dto: EntityMerge) -> EntityORM | None:
        project_id = merge_dto.project_id
        entities_to_delete = merge_dto.entity_ids[:]
        span_text_ids = merge_dto.spantext_ids[:]

        for span_text_id in merge_dto.spantext_ids:
            entity = self.read_by_span_text_id_and_project_id(
                db=db, span_text_id=span_text_id, project_id=project_id
            )
            assert (
                entity is not None
            ), "SpanText given does not belong to an entity withing the current Project\nproject_id: {project_id}\nspan_text: {span_text}"
            if len(entity.span_texts) <= 1:
                entities_to_delete.append(entity.id)

        for entity_id in merge_dto.entity_ids:
            entity = self.read(db=db, id=entity_id)
            if entity is not None:
                assert (
                    entity.project_id == project_id
                ), "Entity given is not in current Project\nproject_id: {project_id}\nentity: {entity}"
                for span_text in entity.span_texts:
                    span_text_ids.append(span_text.id)
        new_entity = self.create(
            db=db,
            create_dto=EntityCreate(
                name=merge_dto.name,
                project_id=project_id,
                span_text_ids=span_text_ids,
            ),
        )
        self.remove_multi(db=db, ids=entities_to_delete)
        return new_entity

    def resolve(self, db: Session, *, resolve_dto: EntityResolve) -> EntityORM | None:
        entities_to_create = []
        entities_to_remove = []
        project_id = resolve_dto.project_id
        for span_text_id in resolve_dto.spantext_ids:
            entity = self.read_by_span_text_id_and_project_id(
                db=db, span_text_id=span_text_id, project_id=project_id
            )
            span_text = crud_span_text.read(db=db, id=span_text_id)
            assert (
                entity is not None
            ), "SpanText given does not belong to an entity withing the current Project\nproject_id: {project_id}\nspan_text: {span_text}"
            entities_to_create.append(
                EntityCreate(
                    name=span_text.text,
                    project_id=project_id,
                    span_text_ids=[span_text_id],
                )
            )
            if len(entity.span_texts) <= 1:
                entities_to_remove.append(entity.id)
        for entity_id in resolve_dto.entity_ids:
            entity = self.read(db=db, id=entity_id)
            assert (
                entity.project_id == project_id
            ), "Entity given is not in current Project\nproject_id: {project_id}\nentity: {entity}"
            entities_to_remove.append(entity_id)
            for span_text in entity.span_texts:
                entities_to_create.append(
                    EntityCreate(
                        name=span_text.text,
                        project_id=project_id,
                        span_text_ids=[span_text.id],
                    )
                )
        self.remove_multi(db=db, ids=entities_to_remove)
        new_entities = self.create_multi(db=db, create_dtos=entities_to_create)

        return new_entities

    def update(
        self, db: Session, *, id: int, update_dto: EntityUpdate
    ) -> EntityORM | None:
        return super().update(db, id=id, update_dto=update_dto)

    def read_by_name_and_project(
        self, db: Session, entity_name: str, proj_id: int
    ) -> Optional[EntityORM]:
        return (
            db.query(self.model)
            .filter(self.model.name == entity_name, self.model.project_id == proj_id)
            .first()
        )

    def read_by_span_text_id_and_project_id(
        self, db: Session, *, span_text_id: int, project_id: int
    ) -> EntityORM:
        span_text_link = crud_span_text_entity_link.read_by_span_text_id_and_project_id(
            db=db, span_text_id=span_text_id, project_id=project_id
        )
        return self.read(db=db, id=span_text_link.linked_entity_id)

    def read_by_project(self, db: Session, proj_id: int) -> List[EntityORM]:
        return db.query(self.model).filter(self.model.project_id == proj_id).all()

    def read_by_id(self, db: Session, entity_id: int) -> Optional[EntityORM]:
        return db.query(self.model).filter(self.model.id == entity_id).first()

    def remove_by_project(self, db: Session, *, proj_id: int) -> List[EntityORM]:
        query = db.query(self.model).filter(self.model.project_id == proj_id)
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]
        self.remove_multi(db=db, ids=ids)
        return ids

    def remove_multi(self, db: Session, *, ids: List[int]) -> bool:
        for id in ids:
            self.remove(db=db, id=id)
        return True


crud_entity = CRUDEntity(EntityORM)
