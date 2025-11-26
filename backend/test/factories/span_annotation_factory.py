from sqlalchemy.orm import Session

from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_orm import SpanAnnotationORM


class SpanAnnotationFactory:
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def create(
        self,
        user_id: int,
        create_dto: SpanAnnotationCreate | None = None,
    ) -> SpanAnnotationORM:
        if create_dto is None:
            create_dto = SpanAnnotationCreate(
                begin=0,
                end=5,
                begin_token=0,
                end_token=1,
                code_id=1,
                span_text="Test Span Text",
                sdoc_id=1,
            )

        return crud_span_anno.create(
            db=self.db_session,
            create_dto=create_dto,
            user_id=user_id,
        )
