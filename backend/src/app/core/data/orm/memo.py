from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.user import UserORM

from app.core.data.orm.orm_base import ORMBase


class MemoORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False, index=True)
    content: Mapped[str] = mapped_column(
        String, nullable=False, index=False
    )  # TODO Flo: This will go to ES soon!
    starred: Mapped[bool] = mapped_column(Boolean, nullable=False, index=True)
    created: Mapped[Optional[int]] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[Optional[datetime]] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="memo",
        passive_deletes=True,
        foreign_keys="objecthandle.c.memo_id",
    )

    attached_to_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("objecthandle.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attached_to: Mapped[Optional["ObjectHandleORM"]] = relationship(
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
