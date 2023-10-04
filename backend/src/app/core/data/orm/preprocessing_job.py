from typing import TYPE_CHECKING, List

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from app.core.data.orm.preprocessing_job_payload import PreprocessingJobPayloadORM
    from app.core.data.orm.project import ProjectORM


class PreprocessingJobORM(ORMBase):
    id = Column(String, primary_key=True)

    status = Column(
        String, nullable=False, index=True, default=BackgroundJobStatus.WAITING
    )
    created = Column(DateTime, server_default=func.now())
    updated = Column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to many
    payloads: List["PreprocessingJobPayloadORM"] = relationship(
        "PreprocessingJobPayloadORM", back_populates="prepro_job", passive_deletes=True
    )

    # many to one
    project_id = Column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: "ProjectORM" = relationship(
        "ProjectORM", back_populates="preprocessing_jobs"
    )
