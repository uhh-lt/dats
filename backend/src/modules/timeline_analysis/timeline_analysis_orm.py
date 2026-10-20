from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from repos.db.orm_base import ORMBase


class TimelineAnalysisORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    timeline_analysis_type: Mapped[str] = mapped_column(
        String, nullable=False, index=False
    )

    # list of TimelineAnalysisConcepts (see DTO)
    concepts: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB(none_as_null=True),
        server_default=text("'[]'::jsonb"),
        nullable=False,
        index=False,
    )

    # TimelineAnalysisSettings (see DTO)
    settings: Mapped[dict[str, Any]] = mapped_column(
        JSONB(none_as_null=True),
        server_default=text("'{}'::jsonb"),
        nullable=False,
        index=False,
    )

    created: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=False
    )
    updated: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
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
