"""The SQL statements of `StepPlanningService`, private to it: only
`step_planning_service.py` imports this file. They lock the project and the
documents to plan, write the planning rows and `project.enabled_features`, in
the lock order the service states, and the pending feature activations of the
project (`project.feature_activations`). Besides the status CRUD and
`source_document_status_rules.py`, this is the only code that touches the step
status rows."""

from typing import NamedTuple

from sqlalchemy import (
    ARRAY,
    ColumnElement,
    CursorResult,
    Integer,
    ScalarSelect,
    String,
    and_,
    delete,
    exists,
    func,
    literal,
    or_,
    select,
    true,
    update,
)
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, aliased
from sqlalchemy.sql.selectable import TableValuedAlias

from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_orm import SourceDocumentORM
from core.doc.source_document_step_status_orm import SourceDocumentStepStatusORM
from core.project.project_crud import crud_project
from core.project.project_orm import ProjectORM
from repos.db.crud_base import BATCH_SIZE
from repos.db.sql_exceptions import NoSuchElementError

# Documents per step: the rows (sdoc id, step) a planning touched
StepRows = dict[JobType, list[int]]


class PlanningChange(NamedTuple):
    """The rows a planning changed in a way it can undo: those it created
    (`create_missing`) and those it set from erroneous to processing
    (`update_to_processing`)."""

    created: StepRows
    redone: StepRows


def _id_values(sdoc_ids: list[int]) -> TableValuedAlias:
    """The documents as a derived table (`sdoc_id`) from one array parameter, to
    join the planning statements with: one statement for all documents instead
    of a batch of `IN` lists, which costs a scan of the step index each."""
    return (
        func.unnest(literal(sdoc_ids, ARRAY(Integer)))
        .table_valued("sdoc_id")
        .render_derived()
    )


def read_sdoc_ids_to_plan(
    db: Session,
    *,
    project_id: int,
    doctype: DocType,
    sdoc_ids: tuple[int, int],
    missing_steps: list[JobType],
    redo_steps: dict[SDocStatus, list[JobType]],
) -> list[int]:
    """
    Read and lock (FOR NO KEY UPDATE) the documents of the project and doctype
    in the id range that lack one of `missing_steps`, or have one of the
    `redo_steps` of a status with that status.

    Args:
        project_id: The project of the documents.
        doctype: The doctype of the documents.
        sdoc_ids: The range of the document ids (after, until]: the batch.
        missing_steps: Steps a document is selected for if one is not planned.
        redo_steps: Per status, the steps a document is selected for if one
            has this status.

    Returns:
        The ids of the selected documents, ascending.
    """
    sdoc = SourceDocumentORM
    conditions = []
    if missing_steps:
        planned = (
            select(func.count())
            .where(
                SourceDocumentStepStatusORM.sdoc_id == sdoc.id,
                SourceDocumentStepStatusORM.step.in_(missing_steps),
            )
            .scalar_subquery()
        )
        conditions.append(planned < len(missing_steps))
    for status, steps in redo_steps.items():
        if not steps:
            continue
        conditions.append(
            exists().where(
                SourceDocumentStepStatusORM.sdoc_id == sdoc.id,
                SourceDocumentStepStatusORM.step.in_(steps),
                SourceDocumentStepStatusORM.status == status,
            )
        )
    if not conditions:
        return []
    return list(
        db.scalars(
            select(sdoc.id)
            .where(
                sdoc.project_id == project_id,
                sdoc.doctype == doctype.value,
                sdoc.id > sdoc_ids[0],
                sdoc.id <= sdoc_ids[1],
                or_(*conditions),
            )
            .order_by(sdoc.id)
            .with_for_update(of=sdoc, key_share=True)
        )
    )


def create_missing(
    db: Session,
    *,
    project_id: int,
    doctype: DocType,
    sdoc_ids: tuple[int, int],
    steps: list[JobType],
) -> StepRows:
    """
    Plan the steps for the documents of the project and doctype in the id
    range: insert a processing row for every (document, step) that has no row;
    existing rows keep their status. `StepPlanningService` has locked the
    documents that lack a step (`read_sdoc_ids_to_plan` with these steps as
    `missing_steps`).

    Args:
        project_id: The project of the documents.
        doctype: The doctype of the documents.
        sdoc_ids: The range of the document ids (after, until]: the batch.
        steps: The steps to plan.

    Returns:
        The planned documents per step (ascending), for the steps in the order
        of `steps`.
    """
    result: StepRows = {step: [] for step in steps}
    if not steps:
        return result
    # one statement: the database pairs the documents with the steps and
    # skips the existing rows, no ids are sent back and forth
    sdoc = SourceDocumentORM
    existing = aliased(SourceDocumentStepStatusORM)
    step_values = (
        func.unnest(literal([step.value for step in steps], ARRAY(String)))
        .table_valued("step")
        .render_derived()
    )
    stmt = (
        insert(SourceDocumentStepStatusORM)
        .from_select(
            ["sdoc_id", "step", "status"],
            select(
                sdoc.id,
                step_values.c.step,
                literal(SDocStatus.processing.value),
            )
            .select_from(sdoc)
            .join(step_values, true())
            .where(
                sdoc.project_id == project_id,
                sdoc.doctype == doctype.value,
                sdoc.id > sdoc_ids[0],
                sdoc.id <= sdoc_ids[1],
                # the range again on the existing rows: the anti join reads
                # the batch's rows from the primary key, not the whole table
                ~exists().where(
                    existing.sdoc_id == sdoc.id,
                    existing.sdoc_id > sdoc_ids[0],
                    existing.sdoc_id <= sdoc_ids[1],
                    existing.step == step_values.c.step,
                ),
            ),
        )
        .on_conflict_do_nothing(
            index_elements=[
                SourceDocumentStepStatusORM.sdoc_id,
                SourceDocumentStepStatusORM.step,
            ]
        )
        .returning(
            SourceDocumentStepStatusORM.sdoc_id, SourceDocumentStepStatusORM.step
        )
    )
    for sdoc_id, step in db.execute(stmt).all():
        result[JobType(step)].append(sdoc_id)
    for planned_ids in result.values():
        planned_ids.sort()
    db.flush()
    return result


def update_to_processing(
    db: Session,
    *,
    sdoc_ids: list[int],
    steps: list[JobType],
    statuses: list[SDocStatus],
) -> StepRows:
    """
    Plan the given steps of the documents again: set those with one of
    `statuses` to processing. `StepPlanningService` has locked the
    documents (`read_sdoc_ids_to_plan`).

    Args:
        sdoc_ids: The documents.
        steps: The steps to plan again.
        statuses: The statuses to set to processing.

    Returns:
        The changed documents per step, for the steps in the order of `steps`.
    """
    result: StepRows = {step: [] for step in steps}
    if not sdoc_ids or not steps or not statuses:
        return result
    ids = _id_values(sdoc_ids)
    changed = db.execute(
        update(SourceDocumentStepStatusORM)
        .where(
            SourceDocumentStepStatusORM.sdoc_id == ids.c.sdoc_id,
            SourceDocumentStepStatusORM.step.in_(steps),
            SourceDocumentStepStatusORM.status.in_(statuses),
        )
        .values(status=SDocStatus.processing)
        .returning(
            SourceDocumentStepStatusORM.sdoc_id, SourceDocumentStepStatusORM.step
        )
        .execution_options(synchronize_session=False)
    ).all()
    for sdoc_id, step in changed:
        result[JobType(step)].append(sdoc_id)
    for changed_ids in result.values():
        changed_ids.sort()
    db.flush()
    return result


def update_blocked_to_erroneous(
    db: Session, *, rows: StepRows, inputs: dict[JobType, list[JobType]]
) -> None:
    """
    Set the given rows that are processing to erroneous if one of their input
    steps is erroneous or not planned: they cannot run. The steps are handled
    in the order of `rows`, which must be the pipeline order, so a failed
    step fails the given steps after it. `StepPlanningService` has locked
    the documents (`read_sdoc_ids_to_plan`).

    Args:
        rows: The documents per step to check, in pipeline order.
        inputs: The input steps of each step in `rows`.
    """
    for step, sdoc_ids in rows.items():
        if not sdoc_ids or not inputs[step]:
            continue
        ids = _id_values(sdoc_ids)
        db.execute(
            update(SourceDocumentStepStatusORM)
            .where(
                SourceDocumentStepStatusORM.sdoc_id == ids.c.sdoc_id,
                _in_range(sdoc_ids),
                SourceDocumentStepStatusORM.step == step,
                SourceDocumentStepStatusORM.status == SDocStatus.processing,
                _count_inputs(
                    inputs[step], [SDocStatus.processing, SDocStatus.finished]
                )
                < len(inputs[step]),
            )
            .values(status=SDocStatus.erroneous)
            .execution_options(synchronize_session=False)
        )
    db.flush()


def read_startable(
    db: Session, *, rows: StepRows, inputs: dict[JobType, list[JobType]]
) -> dict[int, list[JobType]]:
    """
    Read which of the given rows can start now: they are processing and all
    their input steps are finished.

    Args:
        rows: The documents per step to check.
        inputs: The input steps of each step in `rows`.

    Returns:
        The startable steps per document, in the order of `rows`.
    """
    result: dict[int, list[JobType]] = {}
    for step, sdoc_ids in rows.items():
        if not sdoc_ids:
            continue
        ids = _id_values(sdoc_ids)
        startable = db.scalars(
            select(SourceDocumentStepStatusORM.sdoc_id)
            .join(ids, ids.c.sdoc_id == SourceDocumentStepStatusORM.sdoc_id)
            .where(
                _in_range(sdoc_ids),
                SourceDocumentStepStatusORM.step == step,
                SourceDocumentStepStatusORM.status == SDocStatus.processing,
                _count_inputs(inputs[step], [SDocStatus.finished]) == len(inputs[step]),
            )
            .order_by(SourceDocumentStepStatusORM.sdoc_id)
        )
        for sdoc_id in startable:
            result.setdefault(sdoc_id, []).append(step)
    return result


def undo_planning(db: Session, *, change: PlanningChange) -> None:
    """
    Undo the given rows of a planning that are still processing: delete the
    created ones (not planned again) and set the redone ones to erroneous
    again; rows with another status keep it. Locks the documents (FOR NO KEY
    UPDATE) in ascending id order first; the caller has locked the project.

    Args:
        change: The rows to undo.
    """
    sdoc_ids = sorted(
        {sdoc_id for rows in change for ids in rows.values() for sdoc_id in ids}
    )
    if not sdoc_ids:
        return
    sdoc = SourceDocumentORM
    db.scalars(
        select(sdoc.id)
        .where(sdoc.id.in_(select(_id_values(sdoc_ids).c.sdoc_id)))
        .order_by(sdoc.id)
        .with_for_update(of=sdoc, key_share=True)
    ).all()
    row = SourceDocumentStepStatusORM
    for step, step_ids in change.created.items():
        if not step_ids:
            continue
        db.execute(
            delete(row)
            .where(
                row.sdoc_id.in_(select(_id_values(step_ids).c.sdoc_id)),
                row.step == step,
                row.status == SDocStatus.processing,
            )
            .execution_options(synchronize_session=False)
        )
    for step, step_ids in change.redone.items():
        if not step_ids:
            continue
        db.execute(
            update(row)
            .where(
                row.sdoc_id.in_(select(_id_values(step_ids).c.sdoc_id)),
                row.step == step,
                row.status == SDocStatus.processing,
            )
            .values(status=SDocStatus.erroneous)
            .execution_options(synchronize_session=False)
        )
    db.flush()


def delete_pending_by_project(
    db: Session, *, project_id: int, doctype: DocType, steps: list[JobType]
) -> int:
    """
    Unplan the given steps of the project's documents of this doctype that
    are pending (processing); steps with another status keep it.

    Args:
        project_id: The project of the documents.
        doctype: The doctype of the documents.
        steps: The steps to unplan.

    Returns:
        The number of unplanned steps.
    """
    if not steps:
        return 0
    sdoc = SourceDocumentORM
    pending = and_(
        SourceDocumentStepStatusORM.step.in_(steps),
        SourceDocumentStepStatusORM.status == SDocStatus.processing,
    )
    sdoc_ids = list(
        db.scalars(
            select(sdoc.id)
            .where(
                sdoc.project_id == project_id,
                sdoc.doctype == doctype.value,
                exists().where(SourceDocumentStepStatusORM.sdoc_id == sdoc.id, pending),
            )
            .order_by(sdoc.id)
            .with_for_update(of=sdoc, key_share=True)
        )
    )
    deleted = 0
    for i in range(0, len(sdoc_ids), BATCH_SIZE):
        batch_ids = sdoc_ids[i : i + BATCH_SIZE]
        result = db.execute(
            delete(SourceDocumentStepStatusORM)
            .where(SourceDocumentStepStatusORM.sdoc_id.in_(batch_ids), pending)
            .execution_options(synchronize_session=False)
        )
        assert isinstance(result, CursorResult)
        deleted += result.rowcount
    db.flush()
    return deleted


def _in_range(sdoc_ids: list[int]) -> ColumnElement[bool]:
    """The rows of the documents' id range (`sdoc_ids` ascending), next to the
    join with the documents: during an activation the statistics count few
    rows of a newly planned step, so the planner may read all its rows by an
    index on the step; this cheap condition comes before the correlated input
    count, which then runs for the given rows only."""
    return SourceDocumentStepStatusORM.sdoc_id.between(sdoc_ids[0], sdoc_ids[-1])


def _count_inputs(
    input_steps: list[JobType], statuses: list[SDocStatus]
) -> ScalarSelect[int]:
    """The number of the input steps of the row's document that have one of
    the statuses, as a correlated subquery."""
    row = aliased(SourceDocumentStepStatusORM)
    return (
        select(func.count())
        .where(
            row.sdoc_id == SourceDocumentStepStatusORM.sdoc_id,
            row.step.in_(input_steps),
            row.status.in_(statuses),
        )
        .scalar_subquery()
    )


def read_project_locked(
    db: Session, *, project_id: int, shared: bool = False
) -> ProjectORM:
    """
    Read the project's current row and lock it until the transaction ends.

    Args:
        project_id: The project.
        shared: Lock it for reading only (FOR SHARE), so others can read it
            locked too, instead of for an update (FOR NO KEY UPDATE).

    Returns:
        The project.
    """
    db_obj = (
        db.query(ProjectORM)
        .filter(ProjectORM.id == project_id)
        .with_for_update(read=shared, key_share=not shared)
        .populate_existing()
        .first()
    )
    if db_obj is None:
        raise NoSuchElementError(ProjectORM, id=project_id)
    return db_obj


def update_enabled_features(
    db: Session, *, project_id: int, features: list[Feature]
) -> ProjectORM:
    """Store the enabled features of the project. Only
    `FeatureService.resolve_enabled_features` decides them (it adds the
    required features and rejects invalid changes)."""
    db_obj = crud_project.read(db=db, id=project_id)
    db_obj.enabled_features = list(features)
    db.add(db_obj)
    db.flush()
    return db_obj


def update_feature_activation(
    db: Session, *, project_id: int, feature: Feature, activation_id: str | None
) -> ProjectORM:
    """Store the id of the feature's pending activation in the project, or
    remove it (None). The caller has locked the project (FOR NO KEY UPDATE)."""
    db_obj = crud_project.read(db=db, id=project_id)
    activations = dict(db_obj.feature_activations)
    if activation_id is None:
        activations.pop(feature.value, None)
    else:
        activations[feature.value] = activation_id
    db_obj.feature_activations = activations
    db.add(db_obj)
    db.flush()
    return db_obj


def read_last_sdoc_id(db: Session, *, project_id: int) -> int | None:
    """The highest document id of the project, None without documents."""
    return db.scalar(
        select(func.max(SourceDocumentORM.id)).where(
            SourceDocumentORM.project_id == project_id
        )
    )


def read_batch_end(
    db: Session,
    *,
    project_id: int,
    after_sdoc_id: int,
    last_sdoc_id: int,
    batch_size: int,
) -> int | None:
    """
    The end of the next batch of the project's documents: the highest id of
    the (at most) `batch_size` documents after `after_sdoc_id` up to
    `last_sdoc_id`.

    Args:
        project_id: The project of the documents.
        after_sdoc_id: The end of the previous batch (0 before the first).
        last_sdoc_id: The highest id to plan.
        batch_size: The number of documents per batch.

    Returns:
        The highest document id of the batch, None if no document is left.
    """
    sdoc = SourceDocumentORM
    batch = (
        select(sdoc.id)
        .where(
            sdoc.project_id == project_id,
            sdoc.id > after_sdoc_id,
            sdoc.id <= last_sdoc_id,
        )
        .order_by(sdoc.id)
        .limit(batch_size)
        .subquery()
    )
    return db.scalar(select(func.max(batch.c.id)))
