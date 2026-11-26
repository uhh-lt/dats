from datetime import datetime
from typing import Any

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
from sqlalchemy.orm import Mapped, mapped_column

from repos.db.orm_base import ORMBase


class ConceptOverTimeAnalysisORM(ORMBase):
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    last_refinement_job_id: Mapped[str | None] = mapped_column(String, index=False)

    # list of COTAConcepts (see DTO)
    concepts: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB(none_as_null=True),
        server_default=text("'[]'::jsonb"),
        nullable=False,
        index=False,
    )

    # list of COTASentences that form the search space (see DTO)
    search_space: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB(none_as_null=True),
        server_default=text("'[]'::jsonb"),
        nullable=False,
        index=False,
    )

    # COTATimelineSettings (see DTO)
    timeline_settings: Mapped[dict[str, Any]] = mapped_column(
        JSONB(none_as_null=True),
        server_default=text("'{}'::jsonb"),
        nullable=False,
        index=False,
    )

    # COTATrainingSettings (see DTO)
    training_settings: Mapped[dict[str, Any]] = mapped_column(
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

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )

    __table_args__ = (
        PrimaryKeyConstraint("project_id", "id", name="conceptovertimeanalysis_pkey"),
    )
