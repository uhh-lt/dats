from typing import TYPE_CHECKING, List

from sqlalchemy import Column, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.user import UserORM


class ActionORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    executed = Column(DateTime, server_default=func.now(), index=True)

    # one to one
    object_handle: "ObjectHandleORM" = relationship("ObjectHandleORM",
                                                    uselist=False,
                                                    back_populates="action",
                                                    cascade="all, delete",
                                                    passive_deletes=True)

    # one to many
    targets: List["ActionTargetORM"] = relationship("ActionTargetORM",
                                                    back_populates="action",
                                                    cascade="all, delete",
                                                    passive_deletes=True)

    # many to one
    user_id = Column(Integer, ForeignKey('user.id', ondelete="CASCADE"), index=True)
    user: "UserORM" = relationship("UserORM", back_populates="actions")

    project_id = Column(Integer, ForeignKey('project.id', ondelete="CASCADE"), index=True)
    project: "ProjectORM" = relationship("ProjectORM", back_populates="actions")


class ActionTargetORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)

    # one to one
    object_handle: "ObjectHandleORM" = relationship("ObjectHandleORM",
                                                    uselist=False,
                                                    back_populates="action_target",
                                                    cascade="all, delete",
                                                    passive_deletes=True)

    # many to one
    action_id = Column(Integer, ForeignKey('action.id', ondelete="CASCADE"), index=True)
    action: "ActionORM" = relationship("ActionORM", back_populates="targets")
