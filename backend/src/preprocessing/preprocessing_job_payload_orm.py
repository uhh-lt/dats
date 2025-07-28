from typing import TYPE_CHECKING, Optional

from core.job.background_job_base_dto import BackgroundJobStatus
from repos.db.orm_base import ORMBase
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from core.project.project_orm import ProjectORM

    from preprocessing.preprocessing_job_orm import PreprocessingJobORM


class PreprocessingJobPayloadORM(ORMBase):
    id: Mapped[str] = mapped_column(String, primary_key=True)

    filename: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    doc_type: Mapped[str] = mapped_column(String, nullable=False)
    status = mapped_column(
        String, nullable=False, index=True, default=BackgroundJobStatus.WAITING
    )
    current_pipeline_step: Mapped[Optional[str]] = mapped_column(String, default=None)
    error_message: Mapped[Optional[str]] = mapped_column(String, default=None)

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="preprocessing_payloads"
    )

    prepro_job_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("preprocessingjob.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prepro_job: Mapped["PreprocessingJobORM"] = relationship(
        "PreprocessingJobORM", back_populates="payloads"
    )

    source_document_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        default=None,
    )

    def get_project_id(self) -> int:
        return self.project_id
