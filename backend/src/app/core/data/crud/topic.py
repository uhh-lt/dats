from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.topic import TopicCreateIntern, TopicUpdateIntern
from app.core.data.orm.topic import TopicORM


class CRUDTopic(CRUDBase[TopicORM, TopicCreateIntern, TopicUpdateIntern]):
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


crud_topic = CRUDTopic(TopicORM)
