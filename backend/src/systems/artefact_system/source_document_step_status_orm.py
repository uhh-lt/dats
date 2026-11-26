from typing import TYPE_CHECKING

from sqlalchemy import (
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    PrimaryKeyConstraint,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.sdoc_status_enum import SDocStatus
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM


class SourceDocumentStepStatusORM(ORMBase):
    """The status of one pipeline step of a document; no row means the step is
        not planned. Only crud_sdoc_step_status, source_document_status_rules
    (the status filters) and the planning statements of ArtefactService
    (artefact_statements.py) touch it."""

    # many to one; the primary key (sdoc_id, step) indexes it
    sdoc_id: Mapped[int] = mapped_column(Integer)
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="step_statuses",
        primaryjoin="and_(SourceDocumentORM.project_id == SourceDocumentStepStatusORM.project_id, SourceDocumentORM.id == foreign(SourceDocumentStepStatusORM.sdoc_id))",
    )

    step: Mapped[str] = mapped_column(String)
    status: Mapped[SDocStatus] = mapped_column(Integer, nullable=False)
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )

    __table_args__ = (
        PrimaryKeyConstraint(
            "project_id", "sdoc_id", "step", name="sourcedocumentstepstatus_pkey"
        ),
        ForeignKeyConstraint(
            ["project_id", "sdoc_id"],
            ["sourcedocument.project_id", "sourcedocument.id"],
            ondelete="CASCADE",
            name="FK_sourcedocumentstepstatus_sdoc_id",
        ),
        Index("ix_sourcedocumentstepstatus_step_status", "step", "status"),
        # the few unfinished steps, for the overall status filters of crud_sdoc
        Index(
            "ix_sourcedocumentstepstatus_unfinished",
            "status",
            "sdoc_id",
            postgresql_where=text(f"status <> {SDocStatus.finished.value}"),
        ),
    )
