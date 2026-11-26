from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    PrimaryKeyConstraint,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.project.project_orm import ProjectORM


class WhiteboardORM(ORMBase):
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    title: Mapped[str] = mapped_column(String, nullable=False, index=False)
    # WhiteboardContent (see DTO)
    content: Mapped[dict[str, Any]] = mapped_column(
        JSONB(none_as_null=True),
        server_default=text("""'{"nodes":[],"edges":[]}'::jsonb"""),
        nullable=False,
        index=False,
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="whiteboards"
    )

    __table_args__ = (PrimaryKeyConstraint("project_id", "id", name="whiteboard_pkey"),)
