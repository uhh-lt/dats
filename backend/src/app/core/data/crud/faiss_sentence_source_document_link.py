from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase, UpdateDTOType, ORMModelType
from app.core.data.dto.faiss_sentence_source_document_link import (
    FaissSentenceSourceDocumentLinkCreate,
)
from app.core.data.orm.faiss_sentence_source_document_link import (
    FaissSentenceSourceDocumentLinkORM,
)


class CRUDFaissSentenceSourceDocumentLink(
    CRUDBase[
        FaissSentenceSourceDocumentLinkORM, FaissSentenceSourceDocumentLinkCreate, None
    ]
):
    def update(
        self, db: Session, *, id: int, update_dto: UpdateDTOType
    ) -> ORMModelType:
        # Flo: We do not want to update FaissSentenceSourceDocumentLink
        raise NotImplementedError()


crud_faiss_sentence_link = CRUDFaissSentenceSourceDocumentLink(
    FaissSentenceSourceDocumentLinkORM
)
