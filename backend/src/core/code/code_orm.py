from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from repos.db.orm_base import ORMBase
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
    description: Mapped[Optional[str]] = mapped_column(String, index=False)
    color: Mapped[Optional[str]] = mapped_column(String, index=False)
    created: Mapped[Optional[datetime]] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[Optional[datetime]] = mapped_column(
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
    span_annotations: Mapped[List["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM",
        back_populates="code",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # one to many
    bbox_annotations: Mapped[List["BBoxAnnotationORM"]] = relationship(
        "BBoxAnnotationORM",
        back_populates="code",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # one to many
    sentence_annotations: Mapped[List["SentenceAnnotationORM"]] = relationship(
        "SentenceAnnotationORM",
        back_populates="code",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # hierarchy reference
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("code.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    parent: Mapped["CodeORM"] = relationship("CodeORM", remote_side=[id])
    children: Mapped[List["CodeORM"]] = relationship(
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
    def memo_ids(self) -> List[int]:
        if self.object_handle is None:
            return []
        return [memo.id for memo in self.object_handle.attached_memos]
