from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship

from app.db.orm.orm_base import ORMBase


class ProjectORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(String, nullable=False, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(DateTime, server_default=func.now(), onupdate=func.current_timestamp())

    # one to one
    object_handle = relationship("ObjectHandleORM",
                                 uselist=False,
                                 back_populates="project",
                                 cascade="all, delete",
                                 passive_deletes=True)

    # one to many
    codes = relationship("CodeORM",
                         back_populates="project",
                         cascade="all, delete",
                         passive_deletes=True)

    source_documents = relationship("SourceDocumentORM",
                                    back_populates="project",
                                    cascade="all, delete",
                                    passive_deletes=True)

    memos = relationship("MemoORM",
                         back_populates="project",
                         cascade="all, delete",
                         passive_deletes=True)

    document_tags = relationship("DocumentTagORM",
                                 back_populates="project",
                                 cascade="all, delete",
                                 passive_deletes=True)

    # many to many
    users = relationship("UserORM", secondary="ProjectUserLinkTable".lower(), back_populates="projects")


class ProjectUserLinkTable(ORMBase):
    project_id = Column(Integer, ForeignKey("project.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), primary_key=True)
