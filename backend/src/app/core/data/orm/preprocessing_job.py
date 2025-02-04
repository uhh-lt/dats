from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.preprocessing_job_payload import PreprocessingJobPayloadORM
    from app.core.data.orm.project import ProjectORM


class PreprocessingJobORM(ORMBase):
    id: Mapped[str] = mapped_column(String, primary_key=True)

    status: Mapped[str] = mapped_column(
        String, nullable=False, index=True, default=BackgroundJobStatus.WAITING
    )
    created: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to many
    payloads: Mapped[List["PreprocessingJobPayloadORM"]] = relationship(
        "PreprocessingJobPayloadORM", back_populates="prepro_job", passive_deletes=True
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="preprocessing_jobs"
    )
