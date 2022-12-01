from typing import TYPE_CHECKING

from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase

if not TYPE_CHECKING:
    from app.core.data.orm.source_document import SourceDocumentORM


class FaissSentenceSourceDocumentLinkORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    sentence_id = Column(Integer, index=True)

    # many to one
    source_document_id = Column(Integer, ForeignKey("sourcedocument.id", ondelete="CASCADE"), index=True)
    source_document: "SourceDocumentORM" = relationship("SourceDocumentORM", passive_deletes=True)
