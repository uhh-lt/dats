from typing import TYPE_CHECKING, List

from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.span_annotation import SpanAnnotationORM
    from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
    from app.core.data.orm.user import UserORM


class CodeORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, index=True)
    color = Column(String, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(DateTime, server_default=func.now(), onupdate=func.current_timestamp())

    # one to one
    current_code: "CurrentCodeORM" = relationship("CurrentCodeORM",
                                                  uselist=False,
                                                  back_populates="code")  # TODO Flo: How to handle cascading deletes?

    object_handle: "ObjectHandleORM" = relationship("ObjectHandleORM",
                                                    uselist=False,
                                                    back_populates="code",
                                                    cascade="all, delete",
                                                    passive_deletes=True)

    # many to one
    user_id = Column(Integer, ForeignKey('user.id', ondelete="CASCADE"), index=True)
    user: "UserORM" = relationship("UserORM", back_populates="codes")

    project_id = Column(Integer, ForeignKey('project.id', ondelete="CASCADE"), index=True)
    project: "ProjectORM" = relationship("ProjectORM", back_populates="codes")

    # hierarchy reference
    parent_code_id = Column(Integer, ForeignKey('code.id', ondelete="CASCADE"))
    parent_code: "CodeORM" = relationship("CodeORM", remote_side=[id])

    __table_args__ = (
        UniqueConstraint('user_id', 'project_id', 'name', name='UC_name_unique_per_user_and_project'),
    )


class CurrentCodeORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)

    # one to one
    object_handle: "ObjectHandleORM" = relationship("ObjectHandleORM",
                                                    uselist=False,
                                                    back_populates="current_code",
                                                    cascade="all, delete",
                                                    passive_deletes=True)

    code_id = Column(Integer, ForeignKey('code.id'), index=True)
    code: "CodeORM" = relationship("CodeORM", back_populates="current_code")

    # one to many
    span_annotations: List["SpanAnnotationORM"] = relationship("SpanAnnotationORM",
                                                               back_populates="current_code",
                                                               cascade="all, delete",
                                                               passive_deletes=True)

    # one to many
    bbox_annotations: List["BBoxAnnotationORM"] = relationship("BBoxAnnotationORM",
                                                               back_populates="current_code",
                                                               cascade="all, delete",
                                                               passive_deletes=True)
