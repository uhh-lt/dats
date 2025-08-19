from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from modules.ml.source_document_job_status_dto import JobStatus, JobType
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM


class SourceDocumentJobStatusORM(ORMBase):
    id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        index=True,
    )
    source_document: Mapped["SourceDocumentORM"] = relationship("SourceDocumentORM")
    type: Mapped[JobType] = mapped_column(
        Integer, nullable=False, index=False, primary_key=True
    )
    status: Mapped[JobStatus] = mapped_column(Integer, nullable=False, index=False)
    timestamp: Mapped[datetime | None] = mapped_column(DateTime)

    def get_project_id(self) -> int:
        return self.source_document.get_project_id()
