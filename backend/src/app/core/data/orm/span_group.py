from typing import TYPE_CHECKING, List

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.span_annotation import SpanAnnotationORM


class SpanGroupORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: "ObjectHandleORM" = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="span_group",
        passive_deletes=True,
    )

    # many to one
    annotation_document_id = Column(
        Integer,
        ForeignKey("annotationdocument.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    annotation_document: "AnnotationDocumentORM" = relationship(
        "AnnotationDocumentORM", back_populates="span_groups"
    )

    # many to many
    span_annotations: List["SpanAnnotationORM"] = relationship(
        "SpanAnnotationORM",
        secondary="SpanAnnotationSpanGroupLinkTable".lower(),
        back_populates="span_groups",
    )


class SpanAnnotationSpanGroupLinkTable(ORMBase):
    span_annotation_id = Column(
        Integer, ForeignKey("spanannotation.id", ondelete="CASCADE"), primary_key=True
    )
    span_group_id = Column(
        Integer, ForeignKey("spangroup.id", ondelete="CASCADE"), primary_key=True
    )
