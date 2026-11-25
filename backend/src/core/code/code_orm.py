from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
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
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    is_system: Mapped[bool] = mapped_column(Boolean, index=False, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, index=False, nullable=False)
    description: Mapped[str | None] = mapped_column(String, index=False)
    color: Mapped[str | None] = mapped_column(String, index=False)
    created: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="code",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="ObjectHandleORM.code_id",
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="codes")

    # one to many
    span_annotations: Mapped[list["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM",
        back_populates="code",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="spanannotation.c.code_id",
    )

    bbox_annotations: Mapped[list["BBoxAnnotationORM"]] = relationship(
        "BBoxAnnotationORM",
        back_populates="code",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="bboxannotation.c.code_id",
    )

    sentence_annotations: Mapped[list["SentenceAnnotationORM"]] = relationship(
        "SentenceAnnotationORM",
        back_populates="code",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="sentenceannotation.c.code_id",
    )

    # hierarchy reference
    parent_id: Mapped[int | None] = mapped_column(Integer, index=True)
    parent: Mapped["CodeORM | None"] = relationship(
        "CodeORM",
        remote_side=[id],
        back_populates="children",
        foreign_keys=[parent_id],
    )
    children: Mapped[list["CodeORM"]] = relationship(
        "CodeORM",
        back_populates="parent",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys=[parent_id],
    )

    __table_args__ = (
        PrimaryKeyConstraint("project_id", "id", name="code_pkey"),
        UniqueConstraint(
            "project_id",
            "name",
            name="UC_code_name_unique_per_project",
        ),
        UniqueConstraint("project_id", "id", name="UC_code_project_id_id"),
        ForeignKeyConstraint(
            ["project_id", "parent_id"],
            ["code.project_id", "code.id"],
            ondelete="CASCADE",
            name="FK_code_parent_id",
        ),
    )

    @property
    def memo_ids(self) -> list[int]:
        if self.object_handle is None:
            return []
        return [memo.id for memo in self.object_handle.attached_memos]
