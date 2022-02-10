from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, func
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase


class CodeORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)  # TODO Flo: Do we want unique=True?
    description = Column(String, index=True)
    color = Column(String, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(DateTime, server_default=func.now(), onupdate=func.current_timestamp())

    # one to one
    current_code = relationship("CurrentCodeORM",
                                uselist=False,
                                back_populates="code")  # TODO Flo: How to handle cascading deletes?

    object_handle = relationship("ObjectHandleORM",
                                 uselist=False,
                                 back_populates="code",
                                 cascade="all, delete",
                                 passive_deletes=True)

    # many to one
    user_id = Column(Integer, ForeignKey('user.id', ondelete="CASCADE"), index=True)
    user = relationship("UserORM", back_populates="codes")

    project_id = Column(Integer, ForeignKey('project.id', ondelete="CASCADE"), index=True)
    project = relationship("ProjectORM", back_populates="codes")

    # hierarchy reference
    parent_code_id = Column(Integer, ForeignKey('code.id', ondelete="CASCADE"))
    parent_code = relationship("CodeORM", remote_side=[id])


class CurrentCodeORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)

    # one to one
    object_handle = relationship("ObjectHandleORM",
                                 uselist=False,
                                 back_populates="current_code",
                                 cascade="all, delete",
                                 passive_deletes=True)

    code_id = Column(Integer, ForeignKey('code.id'), index=True)
    code = relationship("CodeORM", back_populates="current_code")

    # one to many
    span_annotations = relationship("SpanAnnotationORM",
                                    back_populates="current_code",
                                    cascade="all, delete",
                                    passive_deletes=True)
