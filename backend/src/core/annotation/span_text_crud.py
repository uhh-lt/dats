import tenacity
from core.annotation.span_text_dto import SpanTextCreate
from core.annotation.span_text_orm import SpanTextORM
from psycopg2.errors import UniqueViolation
from repos.db.crud_base import CRUDBase, UpdateNotAllowed
from sqlalchemy.orm import Session


class CRUDSpanText(CRUDBase[SpanTextORM, SpanTextCreate, UpdateNotAllowed]):
    ### CREATE OPERATIONS ###

    def create(self, db: Session, *, create_dto: SpanTextCreate) -> SpanTextORM:
        # Only create when not already present
        db_obj = self.read_by_text(db=db, text=create_dto.text)
        if db_obj is None:
            return super().create(db=db, create_dto=create_dto)
        return db_obj

    @tenacity.retry(
        wait=tenacity.wait_random(),
        stop=tenacity.stop_after_attempt(5),
        retry=tenacity.retry_if_exception_type(UniqueViolation),
        reraise=True,
    )
    def create_multi(
        self, db: Session, *, create_dtos: list[SpanTextCreate]
    ) -> list[SpanTextORM]:
        text_to_create_dto = {create_dto.text: create_dto for create_dto in create_dtos}
        unique_create_dtos = list(text_to_create_dto.values())
        dtos_to_create = []

        # When importing multiple large documents with similar content in parallel, it can happen that
        #  the unique constraint on the text field is violated due to the non-atomic check for
        #  unique create DTOs below! (Line 37-44)
        # Hence, as a quick-and-dirty fix, we retry the method on UniqueViolation...
        text_to_db_obj_map: dict[str, SpanTextORM] = {}
        for unique_create_dto in unique_create_dtos:
            # TODO: this is very inefficient. Can't we read all at once?
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

    ### READ OPERATIONS ###

    def read_by_text(self, db: Session, *, text: str) -> SpanTextORM | None:
        return db.query(self.model).filter(self.model.text == text).first()

    ### UPDATE OPERATIONS ###

    def update(self, db: Session, *, id: int, update_dto):
        # Flo: We no not want to update SpanText
        raise NotImplementedError()


crud_span_text = CRUDSpanText(SpanTextORM)
