from typing import Iterable

from sqlalchemy import (
    BigInteger,
    CursorResult,
    and_,
    case,
    cast,
    delete,
    exists,
    func,
    or_,
    select,
    update,
)
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

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

# A bit per step, to aggregate the steps of a document per status as bit masks
_STEP_BITS: dict[JobType, int] = {step: 1 << i for i, step in enumerate(JobType)}


class CRUDSourceDocumentStepStatus(
    SQLCRUDBase[
        SourceDocumentStepStatusORM,
        SourceDocumentStepStatusCreate,
        UpdateNotAllowed,
        tuple[int, str],  # (sdoc id, step)
    ]
):
    """The only code that reads or writes the pipeline step statuses.

    Every write first locks the documents' rows (`_lock_sdocs`), as the feature
    planning does (`read_sdoc_ids_to_plan`): a status change and a planning of
    the same document run one after the other, so the planning never misses a
    step that finishes while it plans."""

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

    def read_sdoc_ids_to_plan(
        self,
        db: Session,
        *,
        project_id: int,
        doctype: DocType,
        missing_steps: list[JobType],
        redo_steps: list[JobType],
        redo_statuses: list[SDocStatus],
    ) -> list[int]:
        """
        Read and lock (FOR UPDATE) the documents of the project and doctype that
        lack one of `missing_steps`, or have one of `redo_steps` with a status in
        `redo_statuses`.

        Args:
            project_id: The project of the documents.
            doctype: The doctype of the documents.
            missing_steps: Steps a document is selected for if one is not planned.
            redo_steps: Steps a document is selected for if one has a status of
                `redo_statuses`.
            redo_statuses: The statuses of `redo_steps` to select.

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
        if redo_steps and redo_statuses:
            conditions.append(
                exists().where(
                    self.model.sdoc_id == sdoc.id,
                    self.model.step.in_(redo_steps),
                    self.model.status.in_(redo_statuses),
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
                .with_for_update(of=sdoc)
            )
        )

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
        self, db: Session, *, project_id: int
    ) -> list[tuple[DocType, StepStatus, int]]:
        """
        Count the documents of the project per doctype and step status.

        Args:
            project_id: The project.

        Returns:
            Per doctype and combination of step statuses that a document of the
            project has: the doctype, the step statuses and the number of
            documents.
        """
        # per document, one bit mask of its steps per status (cheaper than
        # aggregating the statuses themselves), then count the masks
        sdoc = SourceDocumentORM
        bit = cast(case(_STEP_BITS, value=self.model.step, else_=0), BigInteger)
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
                    for step, step_bit in _STEP_BITS.items()
                    if mask & step_bit
                },
                row[-1],
            )
            for row in rows
        ]

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
