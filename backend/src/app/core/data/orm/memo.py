from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.user import UserORM

from app.core.data.orm.orm_base import ORMBase


class MemoORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    content = Column(
        String, nullable=False, index=False
    )  # TODO Flo: This will go to ES soon!
    starred = Column(Boolean, nullable=False, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: "ObjectHandleORM" = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="memo",
        passive_deletes=True,
        foreign_keys="objecthandle.c.memo_id",
    )

    attached_to_id = Column(
        Integer,
        ForeignKey("objecthandle.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attached_to: "ObjectHandleORM" = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="attached_memos",
        foreign_keys="memo.c.attached_to_id",
    )

    # many to one
    project_id = Column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: "ProjectORM" = relationship("ProjectORM", back_populates="memos")

    user_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user: "UserORM" = relationship("UserORM", back_populates="memos")
