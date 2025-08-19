from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
    from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
    from core.annotation.span_annotation_orm import SpanAnnotationORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM


class CodeORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    is_system: Mapped[bool] = mapped_column(Boolean, index=False, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, index=False, nullable=False)
    description: Mapped[str | None] = mapped_column(String, index=False)
    color: Mapped[str | None] = mapped_column(String, index=False)
    created: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="code",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="codes")

    # one to many
    span_annotations: Mapped[list["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM",
        back_populates="code",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # one to many
    bbox_annotations: Mapped[list["BBoxAnnotationORM"]] = relationship(
        "BBoxAnnotationORM",
        back_populates="code",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # one to many
    sentence_annotations: Mapped[list["SentenceAnnotationORM"]] = relationship(
        "SentenceAnnotationORM",
        back_populates="code",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # hierarchy reference
    parent_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("code.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    parent: Mapped["CodeORM"] = relationship("CodeORM", remote_side=[id])
    children: Mapped[list["CodeORM"]] = relationship(
        "CodeORM",
        back_populates="parent",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "name",
            name="UC_code_name_unique_per_project",
        ),
    )

    @property
    def memo_ids(self) -> list[int]:
        if self.object_handle is None:
            return []
        return [memo.id for memo in self.object_handle.attached_memos]

    def get_project_id(self) -> int:
        return self.project_id
