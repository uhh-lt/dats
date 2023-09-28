from turtle import back
from typing import TYPE_CHECKING

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from app.core.data.orm.preprocessing_job import PreprocessingJobORM
    from app.core.data.orm.project import ProjectORM


class PreprocessingJobPayloadORM(ORMBase):
    id = Column(String, primary_key=True)

    filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)
    status = Column(
        String, nullable=False, index=True, default=BackgroundJobStatus.WAITING
    )
    current_pipeline_step = Column(String, nullable=True, default=None)
    error_message = Column(String, nullable=True, default=None)

    # many to one
    project_id = Column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    project: "ProjectORM" = relationship(
        "ProjectORM", back_populates="preprocessing_payloads"
    )

    prepro_job_id = Column(
        String,
        ForeignKey("preprocessingjob.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prepro_job: "PreprocessingJobORM" = relationship(
        "PreprocessingJobORM", back_populates="payloads"
    )

    source_document_id = Column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        nullable=True,
        default=None,
    )
