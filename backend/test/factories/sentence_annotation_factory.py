from sqlalchemy.orm import Session

from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM


class SentenceAnnotationFactory:
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def create(
        self,
        user_id: int,
        create_dto: SentenceAnnotationCreate | None = None,
    ) -> SentenceAnnotationORM:
        if create_dto is None:
            create_dto = SentenceAnnotationCreate(
                sentence_id_start=0,
                sentence_id_end=1,
                code_id=1,
                sdoc_id=1,
            )
        return crud_sentence_anno.create(
            db=self.db_session, create_dto=create_dto, user_id=user_id
        )
