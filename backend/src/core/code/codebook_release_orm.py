from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.code.code_orm import CodeORM
    from core.project.project_orm import ProjectORM


class CodebookReleaseORM(ORMBase):
    """An immutable, named snapshot of the complete non-system Main codebook."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    version: Mapped[str] = mapped_column(String, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, index=True
    )

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "project.id",
            ondelete="CASCADE",
            name="FK_codebookrelease_project_id_project_id",
        ),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="codebook_releases"
    )

    code_memberships: Mapped[list["CodebookReleaseCodeORM"]] = relationship(
        "CodebookReleaseCodeORM",
        back_populates="release",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "version",
            name="UC_codebook_release_version_per_project",
        ),
        Index("IX_codebook_release_project_created", "project_id", "created"),
    )

    def get_project_id(self) -> int:
        return self.project_id


class CodebookReleaseCodeORM(ORMBase):
    """Pins one logical Code concept to one exact snapshot in a release."""

    release_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "codebookrelease.id",
            ondelete="CASCADE",
            name="FK_codebookreleasecode_release_id_codebookrelease_id",
        ),
        primary_key=True,
    )
    concept_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    code_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "code.id",
            ondelete="CASCADE",
            name="FK_codebookreleasecode_code_id_code_id",
        ),
        nullable=False,
        index=True,
    )

    release: Mapped["CodebookReleaseORM"] = relationship(
        "CodebookReleaseORM", back_populates="code_memberships"
    )
    code: Mapped["CodeORM"] = relationship(
        "CodeORM", back_populates="release_memberships"
    )

    __table_args__ = (
        UniqueConstraint(
            "release_id",
            "code_id",
            name="UC_codebook_release_code_snapshot",
        ),
    )

    def get_project_id(self) -> int:
        return self.release.project_id
