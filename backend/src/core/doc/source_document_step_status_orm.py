from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM


class SourceDocumentStepStatusORM(ORMBase):
    """The status of one pipeline step of a document; no row means the step is
        not planned. Only crud_sdoc_step_status, source_document_status_rules
    (the status filters) and the planning statements of StepPlanningService
    (step_planning_statements.py) touch it."""

    # many to one; the primary key (sdoc_id, step) indexes it
    sdoc_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
    )
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM", back_populates="step_statuses"
    )

    step: Mapped[JobType] = mapped_column(String, primary_key=True)
    status: Mapped[SDocStatus] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        Index("ix_sourcedocumentstepstatus_step_status", "step", "status"),
        # the few unfinished steps, for the overall status filters of crud_sdoc
        Index(
            "ix_sourcedocumentstepstatus_unfinished",
            "status",
            "sdoc_id",
            postgresql_where=text(f"status <> {SDocStatus.finished.value}"),
        ),
    )

    def get_project_id(self) -> int:
        return self.source_document.get_project_id()
