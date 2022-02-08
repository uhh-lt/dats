from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.db.orm.orm_base import ORMBase


class ActionORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)

    # one to one
    object_handle = relationship("ObjectHandleORM",
                                 uselist=False,
                                 back_populates="action",
                                 cascade="all, delete",
                                 passive_deletes=True)

    # one to many
    targets = relationship("ActionTargetORM",
                           back_populates="action",
                           cascade="all, delete",
                           passive_deletes=True)

    # many to one
    user_id = Column(Integer, ForeignKey('user.id', ondelete="CASCADE"), index=True)
    user = relationship("UserORM", back_populates="actions")

    project_id = Column(Integer, ForeignKey('project.id', ondelete="CASCADE"), index=True)
    project = relationship("ProjectORM", back_populates="actions")


class ActionTargetORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)

    # one to one
    object_handle = relationship("ObjectHandleORM",
                                 uselist=False,
                                 back_populates="action_target",
                                 cascade="all, delete",
                                 passive_deletes=True)

    # many to one
    action_id = Column(Integer, ForeignKey('action.id', ondelete="CASCADE"), index=True)
    action = relationship("ActionORM", back_populates="targets")
