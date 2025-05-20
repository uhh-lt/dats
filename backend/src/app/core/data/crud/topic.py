from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.topic import TopicCreateIntern, TopicUpdateIntern
from app.core.data.orm.topic import TopicORM


class CRUDTopic(CRUDBase[TopicORM, TopicCreateIntern, TopicUpdateIntern]):
    pass


crud_topic = CRUDTopic(TopicORM)
