from typing import List, Optional

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.span_text import SpanTextCreate
from app.core.data.orm.span_text import SpanTextORM
from sqlalchemy.orm import Session


class CRUDSpanText(CRUDBase[SpanTextORM, SpanTextCreate, None]):
    def update(self, db: Session, *, id: int, update_dto) -> SpanTextORM:
        # Flo: We no not want to update SourceDocument
        raise NotImplementedError()

    def create(self, db: Session, *, create_dto: SpanTextCreate) -> SpanTextORM:
        # Only create when not already present
        db_obj = self.read_by_text(db=db, text=create_dto.text)
        if not db_obj:
            return super().create(db=db, create_dto=create_dto)
        return db_obj

    def create_multi(
        self, db: Session, *, create_dtos: List[SpanTextCreate]
    ) -> List[SpanTextORM]:
        # Only create when not already present
        span_texts: List[SpanTextORM] = []
        to_create: List[SpanTextCreate] = []
        to_create_idx: List[int] = []

        # TODO best would be "insert all (ignore existing) followed by get all"
        for i, create_dto in enumerate(create_dtos):
            db_obj = self.read_by_text(db=db, text=create_dto.text)
            span_texts.append(db_obj)
            if not db_obj:
                to_create.append(create_dto)
                to_create_idx.append(i)
        if len(to_create) > 0:
            created = super().create_multi(db=db, create_dtos=to_create)
            for i, obj in zip(to_create_idx, created):
                span_texts[i] = obj
        return span_texts

    def read_by_text(self, db: Session, *, text: str) -> Optional[SpanTextORM]:
        return db.query(self.model.id).filter(self.model.text == text).first()

    def read_all_by_text(self, db: Session, *, texts: List[str]) -> List[SpanTextORM]:
        return db.query(self.model.id).filter(self.model.text in texts)


crud_span_text = CRUDSpanText(SpanTextORM)
