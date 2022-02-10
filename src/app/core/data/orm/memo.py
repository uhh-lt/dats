from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, func
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase


class MemoORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    content = Column(String, nullable=False, index=False)  # TODO Flo: This will go to ES soon!
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(DateTime, server_default=func.now(), onupdate=func.current_timestamp())

    # one to one
    attached_to = relationship("ObjectHandleORM", uselist=False, back_populates="attached_memo")

    # FIXME Flo: SQLAlchemy ambiguous FK issue...
    # object_handle = relationship("ObjectHandleORM",
    #                              uselist=False,
    #                              back_populates="memo",
    #                              cascade="all, delete",
    #                              passive_deletes=True)

    # many to one
    project_id = Column(Integer, ForeignKey('project.id'), index=True)
    project = relationship("ProjectORM", back_populates="memos")

    user_id = Column(Integer, ForeignKey('user.id'), index=True)
    user = relationship("UserORM", back_populates="memos")
