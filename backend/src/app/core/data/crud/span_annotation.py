from typing import List, Optional

from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete, and_
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.span_group import crud_span_group
from app.core.data.crud.span_text import crud_span_text
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.span_annotation import SpanAnnotationCreate, SpanAnnotationUpdate
from app.core.data.dto.span_text import SpanTextCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CurrentCodeORM, CodeORM
from app.core.data.orm.span_annotation import SpanAnnotationORM


class CRUDSpanAnnotation(CRUDBase[SpanAnnotationORM, SpanAnnotationCreate, SpanAnnotationUpdate]):

    def create(self, db: Session, *, create_dto: SpanAnnotationCreate) -> SpanAnnotationORM:
        # first create the SpanText
        span_text_orm = crud_span_text.create(db=db, create_dto=SpanTextCreate(text=create_dto.span_text))

        # create the SpanAnnotation (and link the SpanText via FK)
        dto_obj_data = jsonable_encoder(create_dto.dict(exclude={"span_text"}))
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db_obj.span_text_id = span_text_orm.id
        db.add(db_obj)
        db.commit()

        db.refresh(db_obj)
        return db_obj

    def read_by_adoc(self,
                     db: Session,
                     *,
                     adoc_id: int,
                     include_sentences: bool = False,
                     skip: int = 0,
                     limit: int = 100) -> List[SpanAnnotationORM]:
        if include_sentences:
            query = db.query(self.model) \
                .where(self.model.annotation_document_id == adoc_id) \
                .offset(skip).limit(limit)
        else:
            # TODO Flo: can we combine this easily into one query?
            sent_ccid = db.query(CurrentCodeORM.id) \
                .join(CodeORM, CodeORM.id == CurrentCodeORM.code_id) \
                .filter(CodeORM.name == "SENTENCE").scalar()

            query = db.query(self.model) \
                .filter(self.model.annotation_document_id == adoc_id,
                        self.model.current_code_id != sent_ccid) \
                .offset(skip).limit(limit)

        return query.all()

    def remove_by_adoc(self, db: Session, *, adoc_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.annotation_document_id == adoc_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        return list(map(lambda t: t[0], removed_ids))

    def remove_from_all_span_groups(self, db: Session, span_id: int) -> Optional[SpanAnnotationORM]:
        db_obj = self.read(db=db, id=span_id)
        db_obj.span_groups = []
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def add_to_span_group(self, db: Session, span_id: int, group_id: id) -> Optional[SpanAnnotationORM]:
        span_db_obj = self.read(db=db, id=span_id)
        group_db_obj = crud_span_group.read(db=db, id=group_id)
        span_db_obj.span_groups.append(group_db_obj)
        db.add(span_db_obj)
        db.commit()
        db.refresh(span_db_obj)
        return span_db_obj

    def remove_from_span_group(self, db: Session, span_id: int, group_id: id) -> Optional[SpanAnnotationORM]:
        span_db_obj = self.read(db=db, id=span_id)
        group_db_obj = crud_span_group.read(db=db, id=group_id)
        span_db_obj.document_tags.remove(group_db_obj)
        db.commit()
        db.refresh(span_db_obj)
        return span_db_obj


crud_span_anno = CRUDSpanAnnotation(SpanAnnotationORM)
