from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from modules.llm_assistant.llm_assistant_enum import StrategyType, TaskType
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.project.project_orm import ProjectORM


class PromptTemplateORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    task_type: Mapped[TaskType] = mapped_column(String, nullable=False, index=True)
    strategy_type: Mapped[StrategyType] = mapped_column(
        String, nullable=False, index=True
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
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="prompt_templates"
    )

    # one to many
    versions: Mapped[list["PromptTemplateVersionORM"]] = relationship(
        "PromptTemplateVersionORM",
        back_populates="prompt_template",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="PromptTemplateVersionORM.version",
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "name",
            name="UC_prompt_template_name_unique_per_project",
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id


class PromptTemplateVersionORM(ORMBase):
    """An immutable version of a prompt template. Versions are never updated."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # 1, 2, 3, ... per prompt template, in the order of creation
    version: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    # list[LLMAssistantPromptTemplates] (see llm_assistant_job_dto.py)
    prompts: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, index=False
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # many to one
    prompt_template_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("prompttemplate.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prompt_template: Mapped["PromptTemplateORM"] = relationship(
        "PromptTemplateORM", back_populates="versions"
    )

    # the user who saved the version (kept as NULL when the user is deleted)
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="SET NULL"),
        index=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "prompt_template_id",
            "version",
            name="UC_prompt_template_version_unique_per_template",
        ),
    )

    def get_project_id(self) -> int:
        return self.prompt_template.get_project_id()
