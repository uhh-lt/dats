from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
    from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
    from core.annotation.span_annotation_orm import SpanAnnotationORM
    from core.code.code_branch_orm import CodeBranchORM
    from core.code.codebook_release_orm import CodebookReleaseCodeORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM
    from core.user.user_orm import UserORM


class CodeORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Logical identity and version state. ``id`` identifies one immutable snapshot,
    # while ``concept_id`` identifies the code across Main and all branches.
    concept_id: Mapped[UUID] = mapped_column(
        Uuid, default=uuid4, nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )

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

    author_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="SET NULL", name="FK_code_author_id_user_id"),
        nullable=True,
        index=True,
    )
    author: Mapped["UserORM | None"] = relationship(
        "UserORM", back_populates="code_versions"
    )
    commit_message: Mapped[str | None] = mapped_column(String, nullable=True)

    # Every snapshot produced by one user-visible operation shares a change-set ID.
    # This keeps cascades and multi-code merges together in the changelog without
    # introducing a separate mutable "commit" table.
    change_set_id: Mapped[UUID] = mapped_column(
        Uuid, default=uuid4, nullable=False, index=True
    )
    change_kind: Mapped[str] = mapped_column(
        String, default="create", nullable=False, index=True
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

    # NULL denotes Main. A non-null value denotes a collaborative project branch.
    branch_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey(
            "codebranch.id",
            ondelete="CASCADE",
            name="FK_code_branch_id_codebranch_id",
        ),
        nullable=True,
        index=True,
    )
    branch: Mapped["CodeBranchORM | None"] = relationship(
        "CodeBranchORM", back_populates="code_versions"
    )

    # The Main snapshot visible when a concept was first overridden in a branch.
    # It is used for optimistic conflict detection during merges.
    base_main_code_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey(
            "code.id", ondelete="SET NULL", name="FK_code_base_main_code_id_code_id"
        ),
        nullable=True,
        index=True,
    )
    base_main_code: Mapped["CodeORM | None"] = relationship(
        "CodeORM", foreign_keys=[base_main_code_id], remote_side=[id]
    )

    # Exact predecessor used for changelog before/after rendering. For an initial
    # branch override this is the inherited Main snapshot; for a merge it is the
    # Main snapshot replaced by the promoted branch value.
    previous_code_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey(
            "code.id",
            ondelete="SET NULL",
            name="FK_code_previous_code_id_code_id",
        ),
        nullable=True,
        index=True,
    )
    previous_code: Mapped["CodeORM | None"] = relationship(
        "CodeORM", foreign_keys=[previous_code_id], remote_side=[id]
    )

    # Main merge snapshots point at the precise branch snapshot that was promoted.
    # This preserves source-branch provenance even though the new row belongs to Main.
    merged_from_code_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey(
            "code.id",
            ondelete="SET NULL",
            name="FK_code_merged_from_code_id_code_id",
        ),
        nullable=True,
        index=True,
    )
    merged_from_code: Mapped["CodeORM | None"] = relationship(
        "CodeORM", foreign_keys=[merged_from_code_id], remote_side=[id]
    )

    # one to many
    span_annotations: Mapped[list["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM",
        back_populates="code",
        passive_deletes=True,
    )

    # one to many
    bbox_annotations: Mapped[list["BBoxAnnotationORM"]] = relationship(
        "BBoxAnnotationORM",
        back_populates="code",
        passive_deletes=True,
    )

    # one to many
    sentence_annotations: Mapped[list["SentenceAnnotationORM"]] = relationship(
        "SentenceAnnotationORM",
        back_populates="code",
        passive_deletes=True,
    )

    release_memberships: Mapped[list["CodebookReleaseCodeORM"]] = relationship(
        "CodebookReleaseCodeORM", back_populates="code", passive_deletes=True
    )

    # Hierarchies reference logical concepts rather than individual snapshots.
    parent_concept_id: Mapped[UUID | None] = mapped_column(
        Uuid, nullable=True, index=True
    )

    __table_args__ = (
        # PostgreSQL treats NULL values as distinct in ordinary unique
        # constraints, so Main and branch scopes require partial indexes.
        Index(
            "UC_active_main_code_concept",
            "project_id",
            "concept_id",
            unique=True,
            postgresql_where=text("branch_id IS NULL AND is_active"),
        ),
        Index(
            "UC_active_branch_code_concept",
            "project_id",
            "branch_id",
            "concept_id",
            unique=True,
            postgresql_where=text("branch_id IS NOT NULL AND is_active"),
        ),
        Index(
            "UC_active_main_code_name",
            "project_id",
            "name",
            unique=True,
            postgresql_where=text("branch_id IS NULL AND is_active AND NOT is_deleted"),
        ),
        Index(
            "UC_active_branch_code_name",
            "project_id",
            "branch_id",
            "name",
            unique=True,
            postgresql_where=text(
                "branch_id IS NOT NULL AND is_active AND NOT is_deleted"
            ),
        ),
    )

    @property
    def memo_ids(self) -> list[int]:
        if self.object_handle is None:
            return []
        return [memo.id for memo in self.object_handle.attached_memos]

    def get_project_id(self) -> int:
        return self.project_id
