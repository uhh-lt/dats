"""How the statuses of the pipeline steps of a document combine.

A step of a document is erroneous, processing or finished (a row of
`sourcedocumentstepstatus`), or not planned (no row). Only this module and
`crud_sdoc_step_status` touch the status table.

The document rule: a document is erroneous if one of its planned steps is
erroneous, else processing if one is processing, else finished (also if no
step is planned). It exists in Python (`document_status`) and in SQL
(`document_status_filter`); `test_the_overall_status_is_derived_from_the_step_statuses`
checks that both agree.
"""

from typing import Iterable

from sqlalchemy import ColumnElement, and_

from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_orm import SourceDocumentORM
from core.doc.source_document_step_status_orm import SourceDocumentStepStatusORM


def document_status(statuses: Iterable[SDocStatus]) -> SDocStatus:
    """The overall status of a document from the status of its planned steps:
    erroneous if any is erroneous, else processing if any is processing, else
    finished (also if no step is planned)."""
    statuses = set(statuses)
    if SDocStatus.erroneous in statuses:
        return SDocStatus.erroneous
    if SDocStatus.processing in statuses:
        return SDocStatus.processing
    return SDocStatus.finished


def document_status_filter(status: SDocStatus) -> ColumnElement[bool]:
    """Documents with this overall status (`document_status`) as a filter on
    `SourceDocumentORM`: (NOT) EXISTS over their unfinished steps, finished
    means no step is erroneous or processing. Every condition repeats
    `status <> finished`, the predicate of the partial index on the unfinished
    steps."""
    steps = SourceDocumentORM.step_statuses
    step_status = SourceDocumentStepStatusORM.status
    unfinished = step_status != SDocStatus.finished

    def has_step(status: SDocStatus) -> ColumnElement[bool]:
        return steps.any(and_(unfinished, step_status == status))

    match status:
        case SDocStatus.finished:
            return ~steps.any(unfinished)
        case SDocStatus.erroneous:
            return has_step(SDocStatus.erroneous)
        case SDocStatus.processing:
            return ~has_step(SDocStatus.erroneous) & has_step(SDocStatus.processing)
