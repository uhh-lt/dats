from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.document_topic import (
    DocumentTopicCreate,
    DocumentTopicUpdate,
)
from app.core.data.orm.document_topic import DocumentTopicORM


class CRUDDocumentTopic(
    CRUDBase[DocumentTopicORM, DocumentTopicCreate, DocumentTopicUpdate]
):
    pass


crud_document_topic = CRUDDocumentTopic(DocumentTopicORM)
