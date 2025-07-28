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

if TYPE_CHECKING:
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM
    from core.user.user_orm import UserORM

from repos.db.orm_base import ORMBase


class MemoORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    uuid: Mapped[str] = mapped_column(String, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False, index=True)
    content: Mapped[str] = mapped_column(String, nullable=False, index=False)
    content_json: Mapped[str] = mapped_column(String, nullable=False, index=False)
    starred: Mapped[bool] = mapped_column(Boolean, nullable=False, index=True)
    created: Mapped[int] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="memo",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="objecthandle.c.memo_id",
    )

    attached_to_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("objecthandle.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attached_to: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="attached_memos",
        foreign_keys="memo.c.attached_to_id",
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="memos")

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user: Mapped["UserORM"] = relationship("UserORM", back_populates="memos")

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "uuid",
            name="UC_memo_uuid_unique_per_project",
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
