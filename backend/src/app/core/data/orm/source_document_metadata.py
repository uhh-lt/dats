from typing import TYPE_CHECKING

from sqlalchemy import Column, Integer, ForeignKey, String, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.source_document import SourceDocumentORM
    from app.core.data.orm.object_handle import ObjectHandleORM


class SourceDocumentMetadataORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, nullable=False, index=True)
    value = Column(String, index=False)
    read_only = Column(Boolean, nullable=False, index=True)

    # one to one
    object_handle: "ObjectHandleORM" = relationship(
        "ObjectHandleORM", uselist=False, back_populates="source_document_metadata", passive_deletes=True
    )

    # many to one
    source_document_id = Column(
        Integer, ForeignKey("sourcedocument.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_document: "SourceDocumentORM" = relationship("SourceDocumentORM", back_populates="metadata_")

    __table_args__ = (UniqueConstraint("source_document_id", "key", name="UC_unique_metadata_key_per_sdoc"),)
