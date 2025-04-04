from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, UpdateNotAllowed
from app.core.data.dto.span_text import SpanTextCreate
from app.core.data.orm.span_text import SpanTextORM


class CRUDSpanText(CRUDBase[SpanTextORM, SpanTextCreate, UpdateNotAllowed]):
    def update(self, db: Session, *, id: int, update_dto):
        # Flo: We no not want to update SpanText
        raise NotImplementedError()

    def create(self, db: Session, *, create_dto: SpanTextCreate) -> SpanTextORM:
        # Only create when not already present
        db_obj = self.read_by_text(db=db, text=create_dto.text)
        if db_obj is None:
            return super().create(db=db, create_dto=create_dto)
        return db_obj

    def create_multi(
        self, db: Session, *, create_dtos: List[SpanTextCreate]
    ) -> List[SpanTextORM]:
        text_to_create_dto = {create_dto.text: create_dto for create_dto in create_dtos}
        unique_create_dtos = list(text_to_create_dto.values())
        dtos_to_create = []

        text_to_db_obj_map: Dict[str, SpanTextORM] = {}
        for unique_create_dto in unique_create_dtos:
            db_obj = self.read_by_text(db=db, text=unique_create_dto.text)
            if db_obj is None:
                dtos_to_create.append(unique_create_dto)
            else:
                text_to_db_obj_map[unique_create_dto.text] = db_obj

        newly_created_span_texts = []
        if len(dtos_to_create) > 0:
            newly_created_span_texts = super().create_multi(
                db=db, create_dtos=dtos_to_create
            )
        for dto in newly_created_span_texts:
            text_to_db_obj_map[dto.text] = dto

        return [text_to_db_obj_map[create_dto.text] for create_dto in create_dtos]

    def read_by_text(self, db: Session, *, text: str) -> Optional[SpanTextORM]:
        return db.query(self.model).filter(self.model.text == text).first()


crud_span_text = CRUDSpanText(SpanTextORM)
