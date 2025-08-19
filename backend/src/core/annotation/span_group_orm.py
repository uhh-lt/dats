from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.annotation_document_orm import AnnotationDocumentORM
    from core.annotation.span_annotation_orm import SpanAnnotationORM
    from core.memo.object_handle_orm import ObjectHandleORM


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
    span_annotations: Mapped[list["SpanAnnotationORM"]] = relationship(
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

    def get_project_id(self) -> int:
        return self.annotation_document.get_project_id()


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
