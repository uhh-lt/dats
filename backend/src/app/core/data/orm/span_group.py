from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.span_annotation import SpanAnnotationORM


class SpanGroupORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="span_group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # many to one
    annotation_document_id = mapped_column(
        Integer,
        ForeignKey("annotationdocument.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    annotation_document: Mapped["AnnotationDocumentORM"] = relationship(
        "AnnotationDocumentORM", back_populates="span_groups"
    )

    # many to many
    span_annotations: Mapped[List["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM",
        secondary="SpanAnnotationSpanGroupLinkTable".lower(),
        back_populates="span_groups",
    )

    @property
    def user_id(self):
        return self.annotation_document.user_id

    @property
    def sdoc_id(self):
        return self.annotation_document.source_document_id


class SpanAnnotationSpanGroupLinkTable(ORMBase):
    span_annotation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("spanannotation.id", ondelete="CASCADE"),
        primary_key=True,
    )
    span_group_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("spangroup.id", ondelete="CASCADE"),
        primary_key=True,
    )
