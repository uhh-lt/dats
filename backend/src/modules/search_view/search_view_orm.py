from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.project.project_orm import ProjectORM
    from core.user.user_orm import UserORM


class SearchViewORM(ORMBase):
    """A saved search view: a named, per-user, per-project search configuration.

    Stores the filter/group/sort spec for one searchable entity (memo, span
    annotation, ...). `entity_type` discriminates which column enum the JSON blobs
    in `filters`/`group_by`/`sorts` are typed against. The blobs are plain JSON
    (enum members serialize as their string values, e.g. "M_TITLE"), so the table
    itself is entity-agnostic; validation happens in the DTO layer.
    """

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    layout: Mapped[str] = mapped_column(String, nullable=False)
    filters: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    group_by: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    sorts: Mapped[list[object] | None] = mapped_column(JSON, nullable=True)
    selected_properties: Mapped[list[object] | None] = mapped_column(
        JSON, nullable=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="search_views"
    )
    user: Mapped["UserORM"] = relationship("UserORM", back_populates="search_views")

    __table_args__ = (
        # Case-insensitive name uniqueness per user + project + entity type, so the
        # same view name can be reused across different entity types.
        Index(
            "idx_searchview_user_project_entity_lower_name",
            user_id,
            project_id,
            entity_type,
            func.lower(name),
            unique=True,
        ),
        Index(
            "idx_searchview_user_project_entity_position",
            user_id,
            project_id,
            entity_type,
            position,
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
