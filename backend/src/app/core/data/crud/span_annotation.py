from typing import List, Optional

from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete
from sqlalchemy.orm import Session
import srsly

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.span_group import crud_span_group
from app.core.data.crud.span_text import crud_span_text
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.action import ActionType, ActionTargetObjectType, ActionCreate
from app.core.data.dto.span_annotation import SpanAnnotationCreate, SpanAnnotationUpdate
from app.core.data.dto.span_text import SpanTextCreate
from app.core.data.orm.span_annotation import SpanAnnotationORM


class CRUDSpanAnnotation(
    CRUDBase[SpanAnnotationORM, SpanAnnotationCreate, SpanAnnotationUpdate]
):
    def create(
        self, db: Session, *, create_dto: SpanAnnotationCreate
    ) -> SpanAnnotationORM:
        # first create the SpanText
        span_text_orm = crud_span_text.create(
            db=db, create_dto=SpanTextCreate(text=create_dto.span_text)
        )

        # create the SpanAnnotation (and link the SpanText via FK)
        dto_obj_data = jsonable_encoder(create_dto.dict(exclude={"span_text"}))
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db_obj.span_text_id = span_text_orm.id
        db.add(db_obj)
        db.commit()

        db.refresh(db_obj)

        # create action manually because we're not using crud base create
        from app.core.data.crud.action import crud_action

        action_create_dto = ActionCreate(
            project_id=db_obj.annotation_document.source_document.project_id,
            user_id=SYSTEM_USER_ID,  # FIXME use correct user
            action_type=ActionType.CREATE,
            target_type=ActionTargetObjectType.span_annotation,
            target_id=db_obj.id,
            before_state=None,
            after_state=srsly.json_dumps(db_obj.as_dict()),
        )
        crud_action.create(db=db, create_dto=action_create_dto)

        return db_obj

    def create_multi(
        self, db: Session, *, create_dtos: List[SpanAnnotationCreate]
    ) -> List[SpanAnnotationORM]:
        # first create the SpanText
        span_texts_orm = crud_span_text.create_multi(
            db=db,
            create_dtos=[
                SpanTextCreate(text=create_dto.span_text) for create_dto in create_dtos
            ],
        )

        # create the SpanAnnotation (and link the SpanText via FK)
        dto_objs_data = [
            jsonable_encoder(create_dto.dict(exclude={"span_text"}))
            for create_dto in create_dtos
        ]
        # noinspection PyArgumentList
        db_objs = [self.model(**dto_obj_data) for dto_obj_data in dto_objs_data]
        for db_obj, span_text_orm in zip(db_objs, span_texts_orm):
            db_obj.span_text_id = span_text_orm.id
        db.add_all(db_objs)
        db.commit()
        return db_objs

    def read_by_adoc(
        self, db: Session, *, adoc_id: int, skip: int = 0, limit: int = 1000
    ) -> List[SpanAnnotationORM]:
        query = (
            db.query(self.model)
            .where(self.model.annotation_document_id == adoc_id)
            .offset(skip)
            .limit(limit)
        )

        return query.all()

    def remove_by_adoc(self, db: Session, *, adoc_id: int) -> List[int]:
        statement = (
            delete(self.model)
            .where(self.model.annotation_document_id == adoc_id)
            .returning(self.model.id)
        )
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        removed_ids = list(map(lambda t: t[0], removed_ids))

        from app.core.data.crud.annotation_document import crud_adoc

        proj_id = crud_adoc.read(db=db, id=adoc_id).source_document.project_id

        from app.core.data.crud.action import crud_action

        for rid in removed_ids:
            create_dto = ActionCreate(
                project_id=proj_id,
                user_id=SYSTEM_USER_ID,
                action_type=ActionType.DELETE,
                target_type=ActionTargetObjectType.span_annotation,
                target_id=rid,
                before_state="",
                after_state=None,
            )
            crud_action.create(db=db, create_dto=create_dto)

        return removed_ids

    def remove_from_all_span_groups(
        self, db: Session, span_id: int
    ) -> Optional[SpanAnnotationORM]:
        db_obj = self.read(db=db, id=span_id)
        db_obj.span_groups = []
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def add_to_span_group(
        self, db: Session, span_id: int, group_id: int
    ) -> Optional[SpanAnnotationORM]:
        span_db_obj = self.read(db=db, id=span_id)
        group_db_obj = crud_span_group.read(db=db, id=group_id)
        span_db_obj.span_groups.append(group_db_obj)
        db.add(span_db_obj)
        db.commit()
        db.refresh(span_db_obj)
        return span_db_obj

    def remove_from_span_group(
        self, db: Session, span_id: int, group_id: int
    ) -> Optional[SpanAnnotationORM]:
        span_db_obj = self.read(db=db, id=span_id)
        group_db_obj = crud_span_group.read(db=db, id=group_id)
        span_db_obj.document_tags.remove(group_db_obj)
        db.commit()
        db.refresh(span_db_obj)
        return span_db_obj


crud_span_anno = CRUDSpanAnnotation(SpanAnnotationORM)
