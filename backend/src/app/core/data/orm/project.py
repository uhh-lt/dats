from typing import TYPE_CHECKING, List

from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from app.core.data.orm.action import ActionORM
    from app.core.data.orm.analysis_table import AnalysisTableORM
    from app.core.data.orm.code import CodeORM
    from app.core.data.orm.document_tag import DocumentTagORM
    from app.core.data.orm.memo import MemoORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.source_document import SourceDocumentORM
    from app.core.data.orm.user import UserORM


class ProjectORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, unique=True, index=True)
    description = Column(String, nullable=False, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    object_handle: "ObjectHandleORM" = relationship(
        "ObjectHandleORM", uselist=False, back_populates="project", passive_deletes=True
    )

    # one to many
    codes: List["CodeORM"] = relationship(
        "CodeORM", back_populates="project", passive_deletes=True
    )

    source_documents: List["SourceDocumentORM"] = relationship(
        "SourceDocumentORM", back_populates="project", passive_deletes=True
    )

    memos: List["MemoORM"] = relationship(
        "MemoORM", back_populates="project", passive_deletes=True
    )

    document_tags: List["DocumentTagORM"] = relationship(
        "DocumentTagORM", back_populates="project", passive_deletes=True
    )

    analysis_tables: List["AnalysisTableORM"] = relationship(
        "AnalysisTableORM", back_populates="project", passive_deletes=True
    )

    actions: List["ActionORM"] = relationship(
        "ActionORM", back_populates="project", passive_deletes=True
    )
    # many to many
    users: List["UserORM"] = relationship(
        "UserORM", secondary="ProjectUserLinkTable".lower(), back_populates="projects"
    )


class ProjectUserLinkTable(ORMBase):
    project_id = Column(Integer, ForeignKey("project.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), primary_key=True)
