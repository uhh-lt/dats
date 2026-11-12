"""How the statuses of the pipeline steps of a document combine.

A step of a document is erroneous, processing or finished (a row of
`sourcedocumentstepstatus`), or not planned (no row). Only this module and
`crud_sdoc_step_status` touch the status table.

The document rule: a document is erroneous if one of its planned steps is
erroneous, else processing if one is processing, else finished (also if no
step is planned). It exists in Python (`document_status`) and in SQL
(`document_status_filter`); `test_the_overall_status_is_derived_from_the_step_statuses`
checks that both agree.

The step set rule: a set of steps of one document (the steps of a feature) is
processing if one of its steps is processing, else failed if one is erroneous,
else not planned if one is not planned, else ready (`step_set_status`).
`count_step_sets` counts the documents of a project by it.

The two orders differ on purpose: a document with a failed step needs attention
whatever else runs, while a feature that still computes offers Restart, not
Complete.
"""

from dataclasses import dataclass, field
from typing import Iterable, Mapping

from sqlalchemy import ColumnElement, and_

from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus, StepSetStatus
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


def step_set_status(
    steps: Iterable[JobType], statuses: Mapping[JobType, SDocStatus]
) -> StepSetStatus:
    """The status of a set of steps for one document from the status of its
    planned steps (a step without a status is not planned): processing if one
    is processing, else failed if one is erroneous, else not planned if one is
    not planned, else ready (also for no steps)."""
    step_statuses = {statuses.get(step) for step in steps}
    if SDocStatus.processing in step_statuses:
        return StepSetStatus.processing
    if SDocStatus.erroneous in step_statuses:
        return StepSetStatus.failed
    if None in step_statuses:
        return StepSetStatus.not_planned
    return StepSetStatus.ready


@dataclass
class StepSetCounts:
    """The documents of one doctype by the status of a set of steps."""

    total: int = 0
    ready: int = 0
    processing: int = 0
    failed: int = 0
    not_planned: int = 0
    # the steps of the set that are not finished for some document
    missing_steps: set[JobType] = field(default_factory=set)


def count_step_sets(
    *,
    combinations: Iterable[tuple[DocType, Mapping[JobType, SDocStatus], int]],
    step_sets: Mapping[DocType, Iterable[frozenset[JobType]]],
) -> dict[DocType, dict[frozenset[JobType], StepSetCounts]]:
    """
    Count the documents per doctype by the status of each set of steps
    (`step_set_status`).

    Args:
        combinations: Per doctype and combination of step statuses, the number
            of documents (`crud_sdoc_step_status.count_by_project`).
        step_sets: The sets of steps to count per doctype.

    Returns:
        The counts per doctype of `step_sets` and set of steps.
    """
    result = {
        doctype: {steps: StepSetCounts() for steps in sets}
        for doctype, sets in step_sets.items()
    }
    for doctype, statuses, count in combinations:
        for steps, counts in result.get(doctype, {}).items():
            counts.total += count
            match step_set_status(steps, statuses):
                case StepSetStatus.ready:
                    counts.ready += count
                case StepSetStatus.processing:
                    counts.processing += count
                case StepSetStatus.failed:
                    counts.failed += count
                case StepSetStatus.not_planned:
                    counts.not_planned += count
            counts.missing_steps |= {
                step for step in steps if statuses.get(step) != SDocStatus.finished
            }
    return result
