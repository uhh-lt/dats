from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.topic import TopicCreateIntern, TopicUpdateIntern
from app.core.data.orm.document_topic import DocumentTopicORM
from app.core.data.orm.topic import TopicORM


class CRUDTopic(CRUDBase[TopicORM, TopicCreateIntern, TopicUpdateIntern]):
    def read_or_create_outlier_topic(
        self, db, *, aspect_id: int, level: int
    ) -> TopicORM:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.aspect_id == aspect_id,
                self.model.level == level,
                self.model.is_outlier.is_(True),
            )
            .first()
        )
        if db_obj is None:
            db_obj = crud_topic.create(
                db=db,
                create_dto=TopicCreateIntern(
                    aspect_id=aspect_id,
                    level=level,
                    name="Outlier",
                    is_outlier=True,
                ),
            )
        return db_obj

    def read_by_aspect_and_level(
        self, db, *, aspect_id: int, level: int
    ) -> list[TopicORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.aspect_id == aspect_id,
                self.model.level == level,
            )
            .all()
        )

    def read_by_aspect_and_sdoc(
        self, db, *, aspect_id: int, sdoc_id: int
    ) -> list[TopicORM]:
        return (
            db.query(self.model)
            .join(DocumentTopicORM, DocumentTopicORM.topic_id == self.model.id)
            .filter(
                self.model.aspect_id == aspect_id,
                DocumentTopicORM.sdoc_id == sdoc_id,
            )
            .all()
        )


crud_topic = CRUDTopic(TopicORM)
