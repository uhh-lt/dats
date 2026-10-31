from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.prompt.prompt_enum import PromptLanguage, TaskType
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.project.project_orm import ProjectORM


class PromptORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    task_type: Mapped[TaskType] = mapped_column(String, nullable=False, index=True)
    language: Mapped[PromptLanguage] = mapped_column(String, nullable=False, index=True)
    # archived prompts are kept for the runs that used them, but not offered
    is_archived: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="prompts")

    # one to many
    versions: Mapped[list["PromptVersionORM"]] = relationship(
        "PromptVersionORM",
        back_populates="prompt",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="PromptVersionORM.version",
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "name",
            name="UC_prompt_name_unique_per_project",
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id


class PromptVersionORM(ORMBase):
    """An immutable version of a prompt. Versions are never updated."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # 1, 2, 3, ... per prompt, in the order of creation
    version: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    text: Mapped[str] = mapped_column(String, nullable=False, index=False)
    # the selections are snapshots of project data (see prompt_dto.py)
    # PromptSettings
    settings: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, index=False)
    # list[PromptCode]
    codes: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, index=False
    )
    # list[PromptExample]
    examples: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, index=False
    )
    # list[PromptTag]
    tags: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, index=False
    )
    # list[PromptMetadataField]
    metadata_fields: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, index=False
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # many to one
    prompt_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("prompt.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prompt: Mapped["PromptORM"] = relationship("PromptORM", back_populates="versions")

    # the user who saved the version (kept as NULL when the user is deleted)
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="SET NULL"),
        index=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "prompt_id",
            "version",
            name="UC_prompt_version_unique_per_prompt",
        ),
    )

    def get_project_id(self) -> int:
        return self.prompt.get_project_id()
