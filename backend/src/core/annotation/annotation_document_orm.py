from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Sequence,
    UniqueConstraint,
    func,
)
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
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # one to many
    span_annotations: Mapped[list["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM",
        back_populates="annotation_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="SpanAnnotationORM.annotation_document_id",
    )

    span_groups: Mapped[list["SpanGroupORM"]] = relationship(
        "SpanGroupORM",
        back_populates="annotation_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="SpanGroupORM.annotation_document_id",
    )

    bbox_annotations: Mapped[list["BBoxAnnotationORM"]] = relationship(
        "BBoxAnnotationORM",
        back_populates="annotation_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="BBoxAnnotationORM.annotation_document_id",
    )

    sentence_annotations: Mapped[list["SentenceAnnotationORM"]] = relationship(
        "SentenceAnnotationORM",
        back_populates="annotation_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="SentenceAnnotationORM.annotation_document_id",
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_document_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="annotation_documents",
        foreign_keys=[source_document_id],
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    user: Mapped["UserORM"] = relationship(
        "UserORM", back_populates="annotation_documents"
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id", "id", name="UC_annotationdocument_project_id_id"
        ),
        ForeignKeyConstraint(
            ["project_id", "source_document_id"],
            ["sourcedocument.project_id", "sourcedocument.id"],
            ondelete="CASCADE",
            name="FK_annotationdocument_source_document_id",
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
