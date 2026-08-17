from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
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
    icon: Mapped[str | None] = mapped_column(String(64), nullable=True)
    content: Mapped[str] = mapped_column(String, nullable=False, index=False)
    content_json: Mapped[str] = mapped_column(String, nullable=False, index=False)
    created: Mapped[datetime] = mapped_column(
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
        ForeignKey(
            "objecthandle.id",
            ondelete="CASCADE",
            name="fk_memo_attached_to_objecthandle",
        ),
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

    # many to many
    favorited_by_users: Mapped[list["UserORM"]] = relationship(
        "UserORM",
        secondary="MemoFavoriteLinkTable".lower(),
        back_populates="favorite_memos",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("idx_memo_project_updated", "project_id", "updated"),
        UniqueConstraint(
            "project_id",
            "uuid",
            name="UC_memo_uuid_unique_per_project",
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id


class MemoFavoriteLinkTable(ORMBase):
    memo_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("memo.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    )

    __table_args__ = (Index("ix_memofavoritelinktable_memo_id", "memo_id"),)
