from typing import TYPE_CHECKING

from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, func, Boolean
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.user import UserORM

from app.core.data.orm.orm_base import ORMBase


class MemoORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    content = Column(String, nullable=False, index=False)  # TODO Flo: This will go to ES soon!
    starred = Column(Boolean, nullable=False, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(DateTime, server_default=func.now(), onupdate=func.current_timestamp())

    # one to one
    attached_to_id = Column(Integer, ForeignKey('objecthandle.id', ondelete="CASCADE"), nullable=False, index=True)
    attached_to: "ObjectHandleORM" = relationship("ObjectHandleORM", uselist=False, back_populates="attached_memos")

    # FIXME Flo: SQLAlchemy ambiguous FK issue...
    # object_handle = relationship("ObjectHandleORM",
    #                              uselist=False,
    #                              back_populates="memo",
    #                              cascade="all, delete",
    #                              passive_deletes=True)

    # many to one
    project_id = Column(Integer, ForeignKey('project.id', ondelete="CASCADE"), nullable=False, index=True)
    project: "ProjectORM" = relationship("ProjectORM", back_populates="memos")

    user_id = Column(Integer, ForeignKey('user.id', ondelete="CASCADE"), nullable=False, index=True)
    user: "UserORM" = relationship("UserORM", back_populates="memos")
