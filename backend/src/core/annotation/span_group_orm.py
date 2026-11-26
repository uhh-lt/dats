from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.annotation_document_orm import AnnotationDocumentORM
    from core.annotation.span_annotation_orm import SpanAnnotationORM
    from core.memo.object_handle_orm import ObjectHandleORM


class SpanGroupORM(ORMBase):
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="span_group",
        cascade="all, delete-orphan",
        passive_deletes=True,
        primaryjoin="and_(SpanGroupORM.project_id == ObjectHandleORM.project_id, SpanGroupORM.id == foreign(ObjectHandleORM.span_group_id))",
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )

    annotation_document_id: Mapped[int] = mapped_column(
        Integer, nullable=False, index=True
    )
    annotation_document: Mapped["AnnotationDocumentORM"] = relationship(
        "AnnotationDocumentORM",
        back_populates="span_groups",
        primaryjoin="and_(AnnotationDocumentORM.project_id == SpanGroupORM.project_id, AnnotationDocumentORM.id == foreign(SpanGroupORM.annotation_document_id))",
    )

    # many to many (read only: links are written by id columns)
    span_annotations: Mapped[list["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM",
        secondary="SpanAnnotationSpanGroupLinkTable".lower(),
        back_populates="span_groups",
        viewonly=True,
    )

    __table_args__ = (
        PrimaryKeyConstraint("project_id", "id", name="spangroup_pkey"),
        ForeignKeyConstraint(
            ["project_id", "annotation_document_id"],
            ["annotationdocument.project_id", "annotationdocument.id"],
            ondelete="CASCADE",
            name="FK_spangroup_annotation_document_id",
        ),
    )

    @property
    def user_id(self):
        return self.annotation_document.user_id

    @property
    def sdoc_id(self):
        return self.annotation_document.source_document_id


class SpanAnnotationSpanGroupLinkTable(ORMBase):
    span_annotation_id: Mapped[int] = mapped_column(Integer, index=True)
    span_group_id: Mapped[int] = mapped_column(Integer, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )

    __table_args__ = (
        PrimaryKeyConstraint(
            "project_id",
            "span_annotation_id",
            "span_group_id",
            name="spanannotationspangrouplinktable_pkey",
        ),
        ForeignKeyConstraint(
            ["project_id", "span_annotation_id"],
            ["spanannotation.project_id", "spanannotation.id"],
            ondelete="CASCADE",
            name="FK_spanannotationspangrouplinktable_span_annotation_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "span_group_id"],
            ["spangroup.project_id", "spangroup.id"],
            ondelete="CASCADE",
            name="FK_spanannotationspangrouplinktable_span_group_id",
        ),
    )
