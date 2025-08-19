from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.annotation_document_orm import AnnotationDocumentORM
    from core.auth.refresh_token_orm import RefreshTokenORM
    from core.memo.memo_orm import MemoORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM


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
    annotation_documents: Mapped[list["AnnotationDocumentORM"]] = relationship(
        "AnnotationDocumentORM",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    memos: Mapped[list["MemoORM"]] = relationship(
        "MemoORM",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    refresh_tokens: Mapped[list["RefreshTokenORM"]] = relationship(
        "RefreshTokenORM",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # many to many
    projects: Mapped[list["ProjectORM"]] = relationship(
        "ProjectORM", secondary="ProjectUserLinkTable".lower(), back_populates="users"
    )

    def get_project_id(self) -> None:
        return None
