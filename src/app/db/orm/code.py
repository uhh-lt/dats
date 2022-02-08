from sqlalchemy import Column, Integer, ForeignKey, String
from sqlalchemy.orm import relationship

from app.db.orm.orm_base import ORMBase


class CodeORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)  # TODO Flo: Do we want unique=True?
    description = Column(String, index=True)
    color = Column(String, index=True)

    # one to one
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
    code_id = Column(Integer, ForeignKey('code.id'), index=True)
    code = relationship("CodeORM", remote_side=[id])

    # one to many
    annotations = relationship("SpanAnnotationORM",
                               back_populates="span_annotations",
                               cascade="all, delete",
                               passive_deletes=True)
