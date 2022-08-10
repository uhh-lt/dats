from typing import Optional

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.span_text import SpanTextCreate
from app.core.data.orm.span_text import SpanTextORM


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

    def read_by_text(self, db: Session, *, text: str) -> Optional[SpanTextORM]:
        return db.query(self.model.id).filter(self.model.text == text).first()


crud_span_text = CRUDSpanText(SpanTextORM)
