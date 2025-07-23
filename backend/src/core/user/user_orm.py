from datetime import datetime
from typing import TYPE_CHECKING, List

from modules.analysis.timeline_analysis.timeline_analysis_orm import TimelineAnalysisORM
from repos.db.orm_base import ORMBase
from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from core.annotation.annotation_document_orm import AnnotationDocumentORM
    from core.auth.refresh_token_orm import RefreshTokenORM
    from core.memo.memo_orm import MemoORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM
    from modules.analysis.cota.concept_over_time_analysis_orm import (
        ConceptOverTimeAnalysisORM,
    )
    from modules.whiteboard.whiteboard_orm import WhiteboardORM


class UserORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    last_name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    password: Mapped[str] = mapped_column(String, nullable=False)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # one to many
    annotation_documents: Mapped[List["AnnotationDocumentORM"]] = relationship(
        "AnnotationDocumentORM",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    memos: Mapped[List["MemoORM"]] = relationship(
        "MemoORM",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    timeline_analysis: Mapped[List["TimelineAnalysisORM"]] = relationship(
        "TimelineAnalysisORM", back_populates="user", passive_deletes=True
    )

    whiteboards: Mapped[List["WhiteboardORM"]] = relationship(
        "WhiteboardORM", back_populates="user", passive_deletes=True
    )

    cotas: Mapped[List["ConceptOverTimeAnalysisORM"]] = relationship(
        "ConceptOverTimeAnalysisORM", back_populates="user", passive_deletes=True
    )

    refresh_tokens: Mapped[List["RefreshTokenORM"]] = relationship(
        "RefreshTokenORM",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # many to many
    projects: Mapped[List["ProjectORM"]] = relationship(
        "ProjectORM", secondary="ProjectUserLinkTable".lower(), back_populates="users"
    )
