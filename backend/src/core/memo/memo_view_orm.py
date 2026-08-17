from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.project.project_orm import ProjectORM
    from core.user.user_orm import UserORM


class MemoViewORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    layout: Mapped[str] = mapped_column(String, nullable=False)
    filters: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    group_by: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    sort_by: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="memo_views"
    )
    user: Mapped["UserORM"] = relationship("UserORM", back_populates="memo_views")

    __table_args__ = (
        Index(
            "idx_memoview_user_project_lower_name",
            user_id,
            project_id,
            func.lower(name),
            unique=True,
        ),
        Index(
            "idx_memoview_user_project_position",
            user_id,
            project_id,
            position,
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
