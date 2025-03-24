from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.topic_interpretation import (
    TopicInterpretationCreate,
    TopicInterpretationCreateIntern,
    TopicInterpretationUpdateIntern,
)
from app.core.data.orm.topic_interpretation import TopicInterpretationORM


class CRUDTopicInterpretation(
    CRUDBase[
        TopicInterpretationORM,
        TopicInterpretationCreateIntern,
        TopicInterpretationUpdateIntern,
    ]
):
    def create(self, db: Session, create_dto: TopicInterpretationCreate):
        create_dto_as_in_db = TopicInterpretationCreateIntern(
            **create_dto.model_dump(
                exclude_none=True,
            ),
        )

        # update the in db
        db_obj = super().create(db=db, create_dto=create_dto_as_in_db)

        # return the results
        return db_obj


crud_topic_interpretation = CRUDTopicInterpretation(TopicInterpretationORM)
