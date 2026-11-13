from typing import Iterable

from sqlalchemy import (
    BigInteger,
    and_,
    case,
    cast,
    func,
    select,
    update,
)
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import InstrumentedAttribute, Session, aliased

from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_orm import SourceDocumentORM
from core.doc.source_document_step_status_dto import SourceDocumentStepStatusCreate
from core.doc.source_document_step_status_orm import SourceDocumentStepStatusORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase, UpdateNotAllowed
from systems.search_system.sorting import SortDirection

# The status of each planned step of a document; a step without a status is not
# planned.
StepStatus = dict[JobType, SDocStatus]


# The most steps `count_by_project` counts: one bit each in a BIGINT, without the
# sign bit. `bootstrap.register_jobs` rejects more pipeline steps at startup.
MAX_COUNTED_STEPS = 63


class CRUDSourceDocumentStepStatus(
    SQLCRUDBase[
        SourceDocumentStepStatusORM,
        SourceDocumentStepStatusCreate,
        UpdateNotAllowed,
        tuple[int, str],  # (sdoc id, step)
    ]
):
    """The generic reads and writes of the pipeline step statuses. The status
    rows are touched in three places: this CRUD, `source_document_status_rules`
    (the status filters) and the planning statements of `StepPlanningService`
    (`modules/doc_processing/step_planning_statements.py`), which plan the steps
    of a project's documents.

    Every write first locks the documents' rows (`_lock_sdocs`), in the lock
    order of `StepPlanningService`."""

    ### CREATE OPERATIONS ###
    # Inherited from SQLCRUDBase (create_multi: the statuses of new documents)

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

    def read_sdocs_sorted(
        self,
        db: Session,
        *,
        project_id: int,
        doctype: DocType,
        order_by: list[tuple[JobType | InstrumentedAttribute, SortDirection]],
        offset: int | None = None,
        limit: int | None = None,
    ) -> list[SourceDocumentORM]:
        """
        Read the documents of the project and doctype, sorted by the status of
        steps and by columns of the document, then by name.

        Args:
            project_id: The project of the documents.
            doctype: The doctype of the documents.
            order_by: The sorts in order: a step sorts by its status (documents
                without the step last), a column of `SourceDocumentORM` by its
                value.
            offset: The number of documents to skip.
            limit: The most documents to return.

        Returns:
            The sorted documents.
        """
        sdoc = SourceDocumentORM
        query = db.query(sdoc).filter(
            sdoc.project_id == project_id,
            sdoc.doctype == doctype.value,
        )
        order = []
        for key, direction in order_by:
            if isinstance(key, JobType):
                status = aliased(self.model)
                query = query.outerjoin(
                    status,
                    and_(status.sdoc_id == sdoc.id, status.step == key),
                )
                order.append(direction.apply(status.status))
                continue
            order.append(direction.apply(key))
        query = query.order_by(*order, sdoc.name.asc())
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        return query.all()

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

    def _lock_sdocs(self, *, db: Session, sdoc_ids: list[int]) -> None:
        """Lock the documents' rows for a change of their step statuses, in the
        lock order of `StepPlanningService`."""
        ids = sorted(set(sdoc_ids))
        for i in range(0, len(ids), BATCH_SIZE):
            db.execute(
                select(SourceDocumentORM.id)
                .where(SourceDocumentORM.id.in_(ids[i : i + BATCH_SIZE]))
                .order_by(SourceDocumentORM.id)
                .with_for_update(key_share=True)
            )


crud_sdoc_step_status = CRUDSourceDocumentStepStatus(SourceDocumentStepStatusORM)
