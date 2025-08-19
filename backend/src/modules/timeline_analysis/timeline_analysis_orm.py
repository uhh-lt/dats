from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from repos.db.orm_base import ORMBase


class TimelineAnalysisORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    timeline_analysis_type: Mapped[str] = mapped_column(
        String, nullable=False, index=False
    )

    # JSON representation of a list of TimelineAnalysisConcepts (see DTO)
    concepts: Mapped[str] = mapped_column(
        String,
        server_default="[]",
        nullable=False,
        index=False,
    )

    # JSON representation of TimelineAnalysisSettings (see DTO)
    settings: Mapped[str] = mapped_column(
        String,
        server_default="{}",
        nullable=False,
        index=False,
    )

    created: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now(), index=False
    )
    updated: Mapped[datetime | None] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.current_timestamp(),
        index=False,
    )

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    def get_project_id(self) -> int:
        return self.project_id
