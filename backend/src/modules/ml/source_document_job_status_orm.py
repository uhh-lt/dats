from datetime import datetime
from enum import IntEnum
from typing import TYPE_CHECKING, Optional

from repos.db.orm_base import ORMBase
from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM


class JobType(IntEnum):
    QUOTATION_ATTRIBUTION = 100
    COREFERENCE_RESOLUTION = 101
    DOCUMENT_EMBEDDING = 102
    SENTENCE_EMBEDDING = 103


class JobStatus(IntEnum):
    UNQUEUED = 0  # (not queued/planned)
    WAITING = 1  # (not started yet)
    RUNNING = 2  # (currently in progress)
    FINISHED = 3  # (successfully finished)
    ERROR = 4  # (failed to finish)
    ABORTED = 5  # (aborted by user)


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
    timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime)

    def get_project_id(self) -> int:
        return self.source_document.get_project_id()
