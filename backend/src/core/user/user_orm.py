from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.user.user_enum import UserKind
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.annotation_document_orm import AnnotationDocumentORM
    from core.auth.api_key_orm import ApiKeyORM
    from core.auth.refresh_token_orm import RefreshTokenORM
    from core.memo.memo_orm import MemoORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM
    from modules.search_view.search_view_orm import SearchViewORM


class UserORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # human users or virtual annotators (no email, no password, one project)
    kind: Mapped[UserKind] = mapped_column(
        String, nullable=False, server_default=UserKind.HUMAN.value, index=True
    )
    email: Mapped[str | None] = mapped_column(String, unique=True, index=True)
    # a virtual annotator's display name is its first name, its last name is empty
    first_name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    last_name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    password: Mapped[str | None] = mapped_column(String)
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # many to one
    # the project of a virtual annotator, always NULL for human users
    project_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE", name="FK_user_project_id"),
        index=True,
    )
    project: Mapped["ProjectORM | None"] = relationship(
        "ProjectORM", back_populates="virtual_annotators"
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

    search_views: Mapped[list["SearchViewORM"]] = relationship(
        "SearchViewORM",
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

    api_keys: Mapped[list["ApiKeyORM"]] = relationship(
        "ApiKeyORM",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # many to many
    projects: Mapped[list["ProjectORM"]] = relationship(
        "ProjectORM", secondary="ProjectUserLinkTable".lower(), back_populates="users"
    )

    favorite_memos: Mapped[list["MemoORM"]] = relationship(
        "MemoORM",
        secondary="MemoFavoriteLinkTable".lower(),
        back_populates="favorited_by_users",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "first_name",
            name="UC_virtual_annotator_name_unique_per_project",
        ),
        CheckConstraint(
            "(kind = 'human' AND project_id IS NULL AND email IS NOT NULL"
            " AND password IS NOT NULL)"
            " OR (kind = 'virtual' AND project_id IS NOT NULL AND email IS NULL"
            " AND password IS NULL)",
            name="CC_user_kind_fields",
        ),
    )

    @property
    def is_virtual(self) -> bool:
        return self.kind == UserKind.VIRTUAL

    # human users belong to no project, virtual annotators to exactly one
    def get_project_id(self) -> int | None:
        return self.project_id
