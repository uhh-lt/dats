from sqlalchemy import Column, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase


class AnnotationDocumentORM(ORMBase):
    id = Column(Integer, autoincrement=True, unique=True, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(DateTime, server_default=func.now(), onupdate=func.current_timestamp())

    # one to one
    object_handle = relationship("ObjectHandleORM",
                                 uselist=False,
                                 back_populates="annotation_document",
                                 cascade="all, delete",
                                 passive_deletes=True)

    # one to many
    span_annotations = relationship("SpanAnnotationORM",
                                    back_populates="annotation_document",
                                    cascade="all, delete",
                                    passive_deletes=True)

    # many to one
    source_document_id = Column(Integer,
                                ForeignKey("sourcedocument.id", ondelete="CASCADE"),
                                primary_key=True,
                                index=True)
    source_document = relationship("SourceDocumentORM", back_populates="annotation_documents")

    user_id = Column(Integer,
                     ForeignKey("user.id", ondelete="CASCADE"),
                     primary_key=True,
                     index=True)
    user = relationship("UserORM", back_populates="annotation_documents")
