from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.document_aspect import (
    DocumentAspectCreate,
    DocumentAspectUpdate,
)
from app.core.data.orm.document_aspect import DocumentAspectORM
from app.core.data.orm.document_topic import DocumentTopicORM
from app.core.data.orm.topic import TopicORM


class CRUDDocumentAspect(
    CRUDBase[DocumentAspectORM, DocumentAspectCreate, DocumentAspectUpdate]
):
    def read_by_aspect_and_sdoc_ids(
        self, db, *, sdoc_ids: list[int], aspect_id: int
    ) -> list[DocumentAspectORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.aspect_id == aspect_id,
                self.model.sdoc_id.in_(sdoc_ids),
            )
            .all()
        )

    def read_by_aspect_and_topic_ids(
        self, db, *, aspect_id: int, topic_ids: list[int]
    ) -> tuple[list[DocumentAspectORM], list[int]]:
        query = (
            db.query(self.model, DocumentTopicORM.topic_id)
            .join(DocumentTopicORM, DocumentTopicORM.sdoc_id == self.model.sdoc_id)
            .filter(
                self.model.aspect_id == aspect_id,
                DocumentTopicORM.topic_id.in_(topic_ids),
            )
            .all()
        )
        return zip(*query) if query else ([], [])  # type: ignore

    def read_all_with_topics_of_level(
        self, db, *, aspect_id: int, level: int
    ) -> list[DocumentAspectORM]:
        return (
            db.query(self.model)
            .join(DocumentTopicORM, DocumentTopicORM.sdoc_id == self.model.sdoc_id)
            .join(TopicORM, TopicORM.id == DocumentTopicORM.topic_id)
            .filter(
                TopicORM.aspect_id == aspect_id,
                TopicORM.level == level,
            )
            .all()
        )


crud_document_aspect = CRUDDocumentAspect(DocumentAspectORM)
