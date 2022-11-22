from sqlalchemy import Column, Integer, ForeignKey

from app.core.data.orm.orm_base import ORMBase


class FaissSentenceSourceDocumentLinkORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    source_document_id = Column(Integer, ForeignKey("sourcedocument.id"), index=True)
    sentence_id = Column(Integer, index=True)
