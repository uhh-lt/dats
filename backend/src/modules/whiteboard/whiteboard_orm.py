from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.project.project_orm import ProjectORM


class WhiteboardORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    title: Mapped[str] = mapped_column(String, nullable=False, index=False)
    content: Mapped[str] = mapped_column(
        String,
        server_default='{"nodes":[],"edges":[]}',
        nullable=False,
        index=False,
    )

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="whiteboards"
    )

    def get_project_id(self) -> int:
        return self.project_id
