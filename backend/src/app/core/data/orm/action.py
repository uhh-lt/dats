from datetime import datetime
from typing import TYPE_CHECKING

from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.user import UserORM


class ActionORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    executed: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    action_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    target_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    before_state: Mapped[str] = mapped_column(String, nullable=True)
    after_state: Mapped[str] = mapped_column(String, nullable=True)

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="action",
        passive_deletes=True,
        foreign_keys="objecthandle.c.action_id",
    )

    # many to one
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), index=True
    )
    user: Mapped["UserORM"] = relationship("UserORM", back_populates="actions")

    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id", ondelete="CASCADE"), index=True
    )
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="actions")
