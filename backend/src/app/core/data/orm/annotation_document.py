from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, ForeignKey, Integer, Sequence, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
    from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
    from app.core.data.orm.source_document import SourceDocumentORM
    from app.core.data.orm.span_annotation import SpanAnnotationORM
    from app.core.data.orm.span_group import SpanGroupORM
    from app.core.data.orm.user import UserORM

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
    span_annotations: Mapped[List["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM",
        back_populates="annotation_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    span_groups: Mapped[List["SpanGroupORM"]] = relationship(
        "SpanGroupORM",
        back_populates="annotation_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    bbox_annotations: Mapped[List["BBoxAnnotationORM"]] = relationship(
        "BBoxAnnotationORM",
        back_populates="annotation_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    sentence_annotations: Mapped[List["SentenceAnnotationORM"]] = relationship(
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
