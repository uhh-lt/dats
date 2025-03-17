import srsly
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.topic_info import (
    TopicInfoCreate,
    TopicInfoCreateIntern,
    TopicInfoUpdateIntern,
)
from app.core.data.orm.topic_info import TopicInfoORM


class CRUDTopicInfo(
    CRUDBase[
        TopicInfoORM,
        TopicInfoCreateIntern,
        TopicInfoUpdateIntern,
    ]
):
    def create(self, db: Session, create_dto: TopicInfoCreate):
        create_dto_as_in_db = TopicInfoCreateIntern(
            **create_dto.model_dump(
                exclude={"topic_words", "topic_documents"},
                exclude_none=True,
            ),
        )

        topic_word_str = srsly.json_dumps(jsonable_encoder(create_dto.topic_words))
        create_dto_as_in_db.topic_words = topic_word_str

        topic_documents_str = srsly.json_dumps(
            jsonable_encoder(create_dto.topic_documents)
        )
        create_dto_as_in_db.topic_documents = topic_documents_str

        # update the in db
        db_obj = super().create(db=db, create_dto=create_dto_as_in_db)

        # return the results
        return db_obj


crud_topic_info = CRUDTopicInfo(TopicInfoORM)
