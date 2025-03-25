from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.topic_interpretation import (
    TopicInterpretationCreate,
    TopicInterpretationUpdate,
)
from app.core.data.orm.topic_interpretation import TopicInterpretationORM


class CRUDTopicInterpretation(
    CRUDBase[
        TopicInterpretationORM,
        TopicInterpretationCreate,
        TopicInterpretationUpdate,
    ]
):
    pass


crud_topic_interpretation = CRUDTopicInterpretation(TopicInterpretationORM)
