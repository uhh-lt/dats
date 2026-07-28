from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.code.code_orm import CodeORM
    from core.project.project_orm import ProjectORM
    from core.user.user_orm import UserORM


class CodeBranchORM(ORMBase):
    """A named, collaborative code-tree branch within one project."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    is_archived: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "project.id",
            ondelete="CASCADE",
            name="FK_codebranch_project_id_project_id",
        ),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="code_branches"
    )

    created_by_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey(
            "user.id",
            ondelete="SET NULL",
            name="FK_codebranch_created_by_id_user_id",
        ),
        nullable=True,
        index=True,
    )
    created_by: Mapped["UserORM | None"] = relationship(
        "UserORM", back_populates="created_code_branches"
    )

    code_versions: Mapped[list["CodeORM"]] = relationship(
        "CodeORM", back_populates="branch", passive_deletes=True
    )

    __table_args__ = (
        Index(
            "UC_active_code_branch_name_per_project",
            "project_id",
            "name",
            unique=True,
            postgresql_where=text("NOT is_archived"),
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
