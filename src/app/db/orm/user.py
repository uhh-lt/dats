from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship

from app.db.orm.orm_base import ORMBase


class UserORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False, index=True)
    last_name = Column(String, nullable=False, index=True)
    password = Column(String, nullable=False)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(DateTime, server_default=func.now(), onupdate=func.current_timestamp())

    # one to one
    object_handle = relationship("ObjectHandleORM",
                                 uselist=False,
                                 back_populates="user",
                                 cascade="all, delete",
                                 passive_deletes=True)

    # one to many
    codes = relationship("CodeORM",
                         back_populates="user",
                         cascade="all, delete",
                         passive_deletes=True)

    annotation_documents = relationship("AnnotationDocumentORM",
                                        back_populates="user",
                                        cascade="all, delete",
                                        passive_deletes=True)

    memos = relationship("MemoORM",
                         back_populates="user",
                         cascade="all, delete",
                         passive_deletes=True)

    # many to many
    projects = relationship("ProjectORM", secondary="ProjectUserLinkTable".lower(), back_populates="users")
