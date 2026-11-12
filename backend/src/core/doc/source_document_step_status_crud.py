from typing import Iterable

from sqlalchemy import (
    ARRAY,
    BigInteger,
    CursorResult,
    Integer,
    ScalarSelect,
    String,
    and_,
    case,
    cast,
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
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_orm import SourceDocumentORM
from core.doc.source_document_step_status_dto import SourceDocumentStepStatusCreate
from core.doc.source_document_step_status_orm import SourceDocumentStepStatusORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase, UpdateNotAllowed

# The status of each planned step of a document; a step without a status is not
# planned.
StepStatus = dict[JobType, SDocStatus]

# Documents per step: the rows (sdoc id, step) a planning touched
StepRows = dict[JobType, list[int]]


# The most steps `count_by_project` counts: one bit each in a BIGINT, without the
# sign bit. `bootstrap.register_jobs` rejects more pipeline steps at startup.
MAX_COUNTED_STEPS = 63


def _id_values(sdoc_ids: list[int]) -> TableValuedAlias:
    """The documents as a derived table (`sdoc_id`) from one array parameter, to
    join the planning statements with: one statement for all documents instead
    of a batch of `IN` lists, which costs a scan of the step index each."""
    return (
        func.unnest(literal(sdoc_ids, ARRAY(Integer)))
        .table_valued("sdoc_id")
        .render_derived()
    )


class CRUDSourceDocumentStepStatus(
    SQLCRUDBase[
        SourceDocumentStepStatusORM,
        SourceDocumentStepStatusCreate,
        UpdateNotAllowed,
        tuple[int, str],  # (sdoc id, step)
    ]
):
    """The only code that reads or writes the pipeline step statuses.

    Every write first locks the documents' rows (`_lock_sdocs`), except the
    planning writes (`create_missing`, `update_to_processing`,
    `update_blocked_to_erroneous`), which run after `read_sdoc_ids_to_plan`
    locked the documents to plan: a status change and a planning of the same
    document run one after the other, so the planning never misses a step that
    finishes while it plans.

    Known gaps, accepted for now (docs/development/feature-toggles-plan.md):
    - A step that commits finished just before a planning can start a successor
      that the planning starts too; it computes twice.
    - If the activation job cannot be enqueued after the planning committed, its
      rows stay processing without a job until a user restarts the feature.
    - `handle_job_started` reads and sets a job's steps in two transactions, so
      a disable in between is undone for that document."""

    ### CREATE OPERATIONS ###
    # Inherited from SQLCRUDBase (create_multi: the statuses of new documents)

    def create_missing(
        self, db: Session, *, project_id: int, doctype: DocType, steps: list[JobType]
    ) -> StepRows:
        """
        Plan the steps for the documents of the project and doctype: insert a
        processing row for every (document, step) that has no row; existing rows
        keep their status. The caller has locked the documents that lack a step
        (`read_sdoc_ids_to_plan` with these steps as `missing_steps`).

        Args:
            project_id: The project of the documents.
            doctype: The doctype of the documents.
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
        existing = aliased(self.model)
        step_values = (
            func.unnest(literal([step.value for step in steps], ARRAY(String)))
            .table_valued("step")
            .render_derived()
        )
        stmt = (
            insert(self.model)
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
                    ~exists().where(
                        existing.sdoc_id == sdoc.id,
                        existing.step == step_values.c.step,
                    ),
                ),
            )
            .on_conflict_do_nothing(
                index_elements=[self.model.sdoc_id, self.model.step]
            )
            .returning(self.model.sdoc_id, self.model.step)
        )
        for sdoc_id, step in db.execute(stmt).all():
            result[JobType(step)].append(sdoc_id)
        for sdoc_ids in result.values():
            sdoc_ids.sort()
        db.flush()
        return result

    ### READ OPERATIONS ###

    def read_by_sdoc(self, db: Session, *, sdoc_id: int) -> StepStatus:
        """
        Read the status of the planned steps of the document.

        Args:
            sdoc_id: The document.

        Returns:
            The status per planned step; steps that are not planned are missing.
        """
        return self.read_by_sdocs(db=db, sdoc_ids=[sdoc_id])[sdoc_id]

    def read_by_sdocs(
        self, db: Session, *, sdoc_ids: list[int]
    ) -> dict[int, StepStatus]:
        """
        Read the status of the planned steps of the documents.

        Args:
            sdoc_ids: The documents.

        Returns:
            The status per planned step of every given document (an empty dict
            if none is planned), in the order of `sdoc_ids`.
        """
        result: dict[int, StepStatus] = {sdoc_id: {} for sdoc_id in sdoc_ids}
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_ids = sdoc_ids[i : i + BATCH_SIZE]
            rows = db.execute(
                select(self.model.sdoc_id, self.model.step, self.model.status).where(
                    self.model.sdoc_id.in_(batch_ids)
                )
            ).all()
            for sdoc_id, step, status in rows:
                result[sdoc_id][JobType(step)] = SDocStatus(status)
        return result

    def read_sdoc_ids_to_plan(
        self,
        db: Session,
        *,
        project_id: int,
        doctype: DocType,
        missing_steps: list[JobType],
        redo_steps: dict[SDocStatus, list[JobType]],
    ) -> list[int]:
        """
        Read and lock (FOR NO KEY UPDATE) the documents of the project and doctype
        that lack one of `missing_steps`, or have one of the `redo_steps` of a
        status with that status.

        Args:
            project_id: The project of the documents.
            doctype: The doctype of the documents.
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
                    self.model.sdoc_id == sdoc.id,
                    self.model.step.in_(missing_steps),
                )
                .scalar_subquery()
            )
            conditions.append(planned < len(missing_steps))
        for status, steps in redo_steps.items():
            if not steps:
                continue
            conditions.append(
                exists().where(
                    self.model.sdoc_id == sdoc.id,
                    self.model.step.in_(steps),
                    self.model.status == status,
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
                    or_(*conditions),
                )
                .order_by(sdoc.id)
                .with_for_update(of=sdoc, key_share=True)
            )
        )

    def read_startable(
        self, db: Session, *, rows: StepRows, inputs: dict[JobType, list[JobType]]
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
                select(self.model.sdoc_id)
                .join(ids, ids.c.sdoc_id == self.model.sdoc_id)
                .where(
                    self.model.step == step,
                    self.model.status == SDocStatus.processing,
                    self._count_inputs(inputs[step], [SDocStatus.finished])
                    == len(inputs[step]),
                )
                .order_by(self.model.sdoc_id)
            )
            for sdoc_id in startable:
                result.setdefault(sdoc_id, []).append(step)
        return result

    ### UPDATE OPERATIONS ###

    def update_status(
        self,
        db: Session,
        *,
        sdoc_ids: list[int],
        steps: Iterable[JobType],
        status: SDocStatus,
    ) -> None:
        """
        Set the status of the given steps of the documents, planning the steps
        that are not planned yet.

        Args:
            sdoc_ids: The documents.
            steps: The steps.
            status: The new status.
        """
        steps = list(steps)
        if not sdoc_ids or not steps:
            return
        self._lock_sdocs(db=db, sdoc_ids=sdoc_ids)
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_ids = sdoc_ids[i : i + BATCH_SIZE]
            stmt = insert(self.model).values(
                [
                    {"sdoc_id": sdoc_id, "step": step.value, "status": status.value}
                    for sdoc_id in batch_ids
                    for step in steps
                ]
            )
            db.execute(
                stmt.on_conflict_do_update(
                    index_elements=[self.model.sdoc_id, self.model.step],
                    set_={"status": stmt.excluded.status},
                ).execution_options(synchronize_session=False)
            )
        db.flush()

    def update_to_processing(
        self,
        db: Session,
        *,
        sdoc_ids: list[int],
        steps: list[JobType],
        statuses: list[SDocStatus],
    ) -> StepRows:
        """
        Plan the given steps of the documents again: set those with one of
        `statuses` to processing. The caller has locked the documents
        (`read_sdoc_ids_to_plan`).

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
            update(self.model)
            .where(
                self.model.sdoc_id == ids.c.sdoc_id,
                self.model.step.in_(steps),
                self.model.status.in_(statuses),
            )
            .values(status=SDocStatus.processing)
            .returning(self.model.sdoc_id, self.model.step)
            .execution_options(synchronize_session=False)
        ).all()
        for sdoc_id, step in changed:
            result[JobType(step)].append(sdoc_id)
        for changed_ids in result.values():
            changed_ids.sort()
        db.flush()
        return result

    def update_blocked_to_erroneous(
        self, db: Session, *, rows: StepRows, inputs: dict[JobType, list[JobType]]
    ) -> None:
        """
        Set the given rows that are processing to erroneous if one of their input
        steps is erroneous or not planned: they cannot run. The steps are handled
        in the order of `rows`, which must be the pipeline order, so a failed
        step fails the given steps after it. The caller has locked the documents
        (`read_sdoc_ids_to_plan`).

        Args:
            rows: The documents per step to check, in pipeline order.
            inputs: The input steps of each step in `rows`.
        """
        for step, sdoc_ids in rows.items():
            if not sdoc_ids or not inputs[step]:
                continue
            ids = _id_values(sdoc_ids)
            db.execute(
                update(self.model)
                .where(
                    self.model.sdoc_id == ids.c.sdoc_id,
                    self.model.step == step,
                    self.model.status == SDocStatus.processing,
                    self._count_inputs(
                        inputs[step], [SDocStatus.processing, SDocStatus.finished]
                    )
                    < len(inputs[step]),
                )
                .values(status=SDocStatus.erroneous)
                .execution_options(synchronize_session=False)
            )
        db.flush()

    def update_pending_to_erroneous(
        self, db: Session, *, sdoc_id: int, steps: list[JobType]
    ) -> None:
        """
        Set the given steps of the document that are pending (processing) to
        erroneous; steps with another status or not planned keep it.

        Args:
            sdoc_id: The document.
            steps: The steps to fail.
        """
        if not steps:
            return
        self._lock_sdocs(db=db, sdoc_ids=[sdoc_id])
        db.execute(
            update(self.model)
            .where(
                self.model.sdoc_id == sdoc_id,
                self.model.step.in_(steps),
                self.model.status == SDocStatus.processing,
            )
            .values(status=SDocStatus.erroneous)
            .execution_options(synchronize_session=False)
        )
        db.flush()

    ### DELETE OPERATIONS ###

    def delete_pending_by_project(
        self, db: Session, *, project_id: int, doctype: DocType, steps: list[JobType]
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
            self.model.step.in_(steps),
            self.model.status == SDocStatus.processing,
        )
        sdoc_ids = list(
            db.scalars(
                select(sdoc.id)
                .where(
                    sdoc.project_id == project_id,
                    sdoc.doctype == doctype.value,
                    exists().where(self.model.sdoc_id == sdoc.id, pending),
                )
                .order_by(sdoc.id)
                .with_for_update(of=sdoc, key_share=True)
            )
        )
        deleted = 0
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_ids = sdoc_ids[i : i + BATCH_SIZE]
            result = db.execute(
                delete(self.model)
                .where(self.model.sdoc_id.in_(batch_ids), pending)
                .execution_options(synchronize_session=False)
            )
            assert isinstance(result, CursorResult)
            deleted += result.rowcount
        db.flush()
        return deleted

    ### OTHER OPERATIONS ###

    def count_by_project(
        self, db: Session, *, project_id: int, steps: list[JobType]
    ) -> list[tuple[DocType, StepStatus, int]]:
        """
        Count the documents of the project per doctype and status of the given
        steps.

        Args:
            project_id: The project.
            steps: The steps to count, at most `MAX_COUNTED_STEPS`; the statuses
                of other steps are left out.

        Returns:
            Per doctype and combination of step statuses that a document of the
            project has: the doctype, the step statuses and the number of
            documents.
        """
        # per document, one bit mask of its steps per status (cheaper than
        # aggregating the statuses themselves), then count the masks
        sdoc = SourceDocumentORM
        if len(steps) > MAX_COUNTED_STEPS:
            raise ValueError(
                f"Cannot count {len(steps)} steps, at most {MAX_COUNTED_STEPS}."
            )
        step_bits = {step: 1 << i for i, step in enumerate(steps)}
        bit = cast(case(step_bits, value=self.model.step, else_=0), BigInteger)
        masks = {
            status: func.bit_or(case((self.model.status == status, bit), else_=0))
            for status in SDocStatus
        }
        per_sdoc = (
            select(
                self.model.sdoc_id,
                *[mask.label(status.name) for status, mask in masks.items()],
            )
            .join(sdoc, sdoc.id == self.model.sdoc_id)
            .where(sdoc.project_id == project_id)
            .group_by(self.model.sdoc_id)
            .subquery()
        )
        columns = [func.coalesce(per_sdoc.c[status.name], 0) for status in SDocStatus]
        # the JIT compilation of this aggregate takes longer than it saves
        # (about 0.4 of 1.3 seconds on 300,000 documents)
        jit = db.execute(select(func.current_setting("jit"))).scalar_one()
        db.execute(select(func.set_config("jit", "off", True)))
        rows = db.execute(
            select(sdoc.doctype, *columns, func.count())
            .select_from(sdoc)
            .outerjoin(per_sdoc, per_sdoc.c.sdoc_id == sdoc.id)
            .where(sdoc.project_id == project_id)
            .group_by(sdoc.doctype, *columns)
        ).all()
        db.execute(select(func.set_config("jit", jit, True)))
        return [
            (
                DocType(row[0]),
                {
                    step: status
                    for status, mask in zip(SDocStatus, row[1:-1])
                    for step, step_bit in step_bits.items()
                    if mask & step_bit
                },
                row[-1],
            )
            for row in rows
        ]

    def _count_inputs(
        self, input_steps: list[JobType], statuses: list[SDocStatus]
    ) -> ScalarSelect[int]:
        """The number of the input steps of the row's document that have one of
        the statuses, as a correlated subquery."""
        row = aliased(self.model)
        return (
            select(func.count())
            .where(
                row.sdoc_id == self.model.sdoc_id,
                row.step.in_(input_steps),
                row.status.in_(statuses),
            )
            .scalar_subquery()
        )

    def _lock_sdocs(self, *, db: Session, sdoc_ids: list[int]) -> None:
        """Lock the documents' rows, in id order (no deadlocks), for a change of
        their step statuses."""
        ids = sorted(set(sdoc_ids))
        for i in range(0, len(ids), BATCH_SIZE):
            db.execute(
                select(SourceDocumentORM.id)
                .where(SourceDocumentORM.id.in_(ids[i : i + BATCH_SIZE]))
                .order_by(SourceDocumentORM.id)
                .with_for_update(key_share=True)
            )


crud_sdoc_step_status = CRUDSourceDocumentStepStatus(SourceDocumentStepStatusORM)
