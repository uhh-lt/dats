from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Sequence, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
    from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
    from core.annotation.span_annotation_orm import SpanAnnotationORM
    from core.annotation.span_group_orm import SpanGroupORM
    from core.doc.source_document_orm import SourceDocumentORM
    from core.user.user_orm import UserORM

annotation_document_id_sequence = Sequence(name="annotation_document_id_sequence")


class AnnotationDocumentORM(ORMBase):
    id: Mapped[int] = mapped_column(
        Integer,
        annotation_document_id_sequence,
        server_default=annotation_document_id_sequence.next_value(),
        unique=True,
        index=True,
    )
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to many
    span_annotations: Mapped[list["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM",
        back_populates="annotation_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    span_groups: Mapped[list["SpanGroupORM"]] = relationship(
        "SpanGroupORM",
        back_populates="annotation_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    bbox_annotations: Mapped[list["BBoxAnnotationORM"]] = relationship(
        "BBoxAnnotationORM",
        back_populates="annotation_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    sentence_annotations: Mapped[list["SentenceAnnotationORM"]] = relationship(
        "SentenceAnnotationORM",
        back_populates="annotation_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # many to one
    source_document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM", back_populates="annotation_documents"
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    user: Mapped["UserORM"] = relationship(
        "UserORM", back_populates="annotation_documents"
    )

    def get_project_id(self) -> int:
        return self.source_document.get_project_id()
