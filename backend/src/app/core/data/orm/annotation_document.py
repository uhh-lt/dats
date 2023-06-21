from typing import TYPE_CHECKING, List

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Sequence, func
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.source_document import SourceDocumentORM
    from app.core.data.orm.span_annotation import SpanAnnotationORM
    from app.core.data.orm.span_group import SpanGroupORM
    from app.core.data.orm.user import UserORM

annotation_document_id_sequence = Sequence(name="annotation_document_id_sequence")


class AnnotationDocumentORM(ORMBase):
    id = Column(
        Integer,
        annotation_document_id_sequence,
        server_default=annotation_document_id_sequence.next_value(),
        unique=True,
        index=True,
    )
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: "ObjectHandleORM" = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="annotation_document",
        passive_deletes=True,
    )

    # one to many
    span_annotations: List["SpanAnnotationORM"] = relationship(
        "SpanAnnotationORM", back_populates="annotation_document", passive_deletes=True
    )

    span_groups: List["SpanGroupORM"] = relationship(
        "SpanGroupORM", back_populates="annotation_document", passive_deletes=True
    )

    bbox_annotations: List["BBoxAnnotationORM"] = relationship(
        "BBoxAnnotationORM", back_populates="annotation_document", passive_deletes=True
    )

    # many to one
    source_document_id = Column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    source_document: "SourceDocumentORM" = relationship(
        "SourceDocumentORM", back_populates="annotation_documents"
    )

    user_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    user: "UserORM" = relationship("UserORM", back_populates="annotation_documents")
