from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    PrimaryKeyConstraint,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM
    from core.user.user_orm import UserORM


class MemoORM(ORMBase):
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)
    uuid: Mapped[str] = mapped_column(String, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False, index=True)
    icon: Mapped[str | None] = mapped_column(String(64))
    content: Mapped[str] = mapped_column(String, nullable=False, index=False)
    content_json: Mapped[str] = mapped_column(String, nullable=False, index=False)
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # many to one
    attached_to_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    attached_to: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="attached_memos",
        foreign_keys=[attached_to_id],
    )

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="memos")

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user: Mapped["UserORM"] = relationship("UserORM", back_populates="memos")

    # many to many (read only: links are written by id columns)
    favorited_by_users: Mapped[list["UserORM"]] = relationship(
        "UserORM",
        secondary="MemoFavoriteLinkTable".lower(),
        back_populates="favorite_memos",
        viewonly=True,
    )

    __table_args__ = (
        PrimaryKeyConstraint("project_id", "id", name="memo_pkey"),
        Index("idx_memo_project_updated", "project_id", "updated"),
        UniqueConstraint(
            "project_id",
            "uuid",
            name="UC_memo_uuid_unique_per_project",
        ),
        UniqueConstraint("project_id", "id", name="UC_memo_project_id_id"),
        ForeignKeyConstraint(
            ["project_id", "attached_to_id"],
            ["objecthandle.project_id", "objecthandle.id"],
            ondelete="CASCADE",
            name="FK_memo_attached_to_id",
        ),
    )


class MemoFavoriteLinkTable(ORMBase):
    memo_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "memo_id"],
            ["memo.project_id", "memo.id"],
            ondelete="CASCADE",
            name="FK_memofavoritelinktable_memo_id",
        ),
    )


class MemoRecentORM(ORMBase):
    """Tracks when a user last opened a memo (for "recently opened" lists).

    One row per (user, memo). The memo FK cascades, so deleting a memo
    automatically removes its recents entries.
    """

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    memo_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    last_opened: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # many to one
    memo: Mapped["MemoORM"] = relationship("MemoORM", foreign_keys=[memo_id])

    __table_args__ = (
        Index("ix_memorecent_user_last_opened", "user_id", "last_opened"),
        ForeignKeyConstraint(
            ["project_id", "memo_id"],
            ["memo.project_id", "memo.id"],
            ondelete="CASCADE",
            name="FK_memorecent_memo_id",
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
