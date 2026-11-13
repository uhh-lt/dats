from typing import TYPE_CHECKING, Collection
from uuid import uuid4

from loguru import logger
from sqlalchemy.orm import Session

from common.artefact_enum import CORE_ARTEFACTS, Artefact
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from common.singleton_meta import SingletonMeta
from config import conf
from core.project.project_crud import crud_project
from repos.db.sql_repo import SQLRepo
from systems.artefact_system import artefact_statements as statements
from systems.artefact_system.artefact_dto import (
    ArtefactComputationJobInput,
    ProcessingSettings,
)
from systems.artefact_system.artefact_registry import artefact_registry
from systems.artefact_system.source_document_status_rules import (
    Availability,
    count_step_sets,
)
from systems.artefact_system.source_document_step_status_crud import (
    crud_sdoc_step_status,
)
from systems.artefact_system.step_run import start_steps
from systems.job_system.job_dto import Job
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobPriority

if TYPE_CHECKING:
    from core.project.project_orm import ProjectORM

# documents an artefact computation plans per transaction (the longest lock hold)
COMPUTATION_BATCH_SIZE = conf.artefact_computation.batch_size


class ArtefactService(metaclass=SingletonMeta):
    """Step planning and availability: which pipeline steps the documents of a
    project get a step status for, and how available some artefacts are in a
    project. It knows artefacts and steps, never features: the feature system
    passes the artefacts of a feature (`compute`, `read_availability`), the
    upload the artefact demand of the project (`plan_document`). Its
    operations are the only code that plans steps (adds or changes the status
    rows of a planning) and changes `project.artefact_computations`; their SQL
    is private to it, in `artefact_statements.py`. The failure rule and the
    lock order are in the README next to this file.

    `compute` only stores a pending artefact computation and starts its job
    before the caller's transaction commits. The job
    (`handle_artefact_computation_job`) plans and starts the steps of the
    project's documents in batches, one transaction each; its first
    statement is a share lock on the project, which waits until the request's
    lock is released, so the job reads the committed state. If the enqueue
    fails, the request rolls back; if the request rolls back after the
    enqueue, the job finds no pending computation with its id and stops.

    Known gap: a step that commits finished just before a planning can start a
    successor that the planning starts too; it computes twice."""

    def __new__(cls, *args, **kwargs):
        cls.js = JobService()
        cls.sqlr = SQLRepo()
        return super(ArtefactService, cls).__new__(cls)

    def compute(
        self,
        *,
        db: Session,
        project_id: int,
        artefacts: frozenset[Artefact],
        settings: ProcessingSettings,
    ) -> None:
        """Compute the artefacts for the project's documents that lack them,
        the erroneous steps included (see `_plan_missing_steps`), on the
        low-priority queue with these settings: store a pending artefact
        computation and start its job before the caller's transaction commits.
        A project without documents needs none. Locks the project (FOR NO KEY
        UPDATE)."""
        crud_project.read_locked(db=db, id=project_id)
        last_sdoc_id = statements.read_last_sdoc_id(db=db, project_id=project_id)
        if last_sdoc_id is None:
            return
        computation = ArtefactComputationJobInput(
            project_id=project_id,
            artefacts=sorted(a.value for a in artefacts),
            settings=settings,
            computation_id=uuid4().hex,
            last_sdoc_id=last_sdoc_id,
        )
        statements.update_artefact_computation(
            db=db,
            project_id=project_id,
            computation_id=computation.computation_id,
            artefacts=computation.artefacts,
        )
        self.js.start_job(JobType.ARTEFACT_COMPUTATION, computation)

    def read_availability(
        self,
        *,
        db: Session,
        project_id: int,
        artefact_sets: Collection[frozenset[Artefact]],
    ) -> dict[frozenset[Artefact], Availability]:
        """How available each set of artefacts is in the project: per set, each
        document of a doctype the set applies to counts once, by the status of
        the steps the set needs (`step_set_status`), and the set is pending
        while an artefact computation of one of its artefacts has not ended.
        The counts are computed in one aggregate query for all sets."""
        graph = artefact_registry.graph()
        project = crud_project.read(db=db, id=project_id)
        pending = {
            artefact
            for artefacts in project.artefact_computations.values()
            for artefact in artefacts
        }

        # 1) the steps of each set per doctype it applies to
        steps = {
            artefacts: {
                doctype: step_set
                for doctype in DocType
                if graph.applies(doctype, artefacts)
                and (step_set := frozenset(graph.steps_for(doctype, artefacts)))
            }
            for artefacts in artefact_sets
        }

        # 2) the documents per doctype by the status of these steps
        counts = count_step_sets(
            combinations=crud_sdoc_step_status.count_by_project(
                db=db,
                project_id=project_id,
                steps=[s for s in JobType if s in graph.all_steps()],
            ),
            step_sets={
                doctype: {s[doctype] for s in steps.values() if doctype in s}
                for doctype in DocType
            },
        )

        # 3) sum up per set
        result: dict[frozenset[Artefact], Availability] = {}
        for artefacts, step_sets in steps.items():
            per_doctype = [counts[d][s] for d, s in step_sets.items()]
            result[artefacts] = Availability(
                total=sum(c.total for c in per_doctype),
                ready=sum(c.ready for c in per_doctype),
                processing=sum(c.processing for c in per_doctype),
                failed=sum(c.failed for c in per_doctype),
                not_planned=sum(c.not_planned for c in per_doctype),
                pending=any(a.value in pending for a in artefacts),
            )
        return result

    def plan_document(
        self,
        *,
        db: Session,
        sdoc_id: int,
        doctype: DocType,
        demand: frozenset[Artefact],
    ) -> list[JobType]:
        """Plan the steps of a new document of this doctype for the core
        artefacts and the demand, so the document is never seen as finished;
        the other steps stay not planned. Returns its planned root steps, which
        the caller starts with `start_steps` once its transaction committed.

        Precondition: the caller read `demand` under the project share lock
        (`FeatureService.read_artefact_demand`), so a concurrent Enable waits
        for this upload and plans its steps for this document too, or this
        upload plans them for it."""
        graph = artefact_registry.graph()
        needed = {
            *graph.steps_for(doctype, CORE_ARTEFACTS),
            *graph.steps_for(doctype, demand),
        }
        steps = [s for s in graph.steps(doctype) if s in needed]
        crud_sdoc_step_status.update_status(
            db=db, sdoc_ids=[sdoc_id], steps=steps, status=SDocStatus.processing
        )
        return [s for s in graph.roots(doctype) if s in needed]

    def handle_artefact_computation_job(
        self, *, job: Job, payload: ArtefactComputationJobInput
    ) -> None:
        """Run an artefact computation: plan and start the steps its artefacts
        need for the project's documents up to its last document, in batches of
        documents with one transaction each (`_plan_batch`), on the
        low-priority queue with its settings. After each batch commits, its
        steps whose inputs are finished start; the steps after them start
        through the normal advancing. A step that cannot start becomes
        erroneous (`start_steps`), and the other documents still start.

        At the end it removes the pending computation (`end_computation`). If
        the computation fails, also because its worker died, the failure
        callback ends it (`step_run.handle_job_error`): the documents it did
        not reach stay unplanned, the artefacts read partly available and
        another computation plans them. It opens its transactions itself: one
        commit per batch, so no lock is held longer than a batch. Called only
        by `artefact_computation_job.py`."""
        with self.sqlr.transaction() as db:
            project = crud_project.read_locked(
                db=db, id=payload.project_id, shared=True
            )
            if not self._is_pending(project=project, computation=payload):
                logger.info(
                    f"Artefact computation {payload.computation_id} is not "
                    f"pending: its request rolled back."
                )
                return
        logger.info(
            f"Planning {payload.artefacts} for the documents of project "
            f"{payload.project_id} up to {payload.last_sdoc_id}..."
        )
        after_sdoc_id = 0
        documents = 0
        failed = 0
        while True:
            with self.sqlr.transaction() as db:
                batch = self._plan_batch(
                    db=db, computation=payload, after_sdoc_id=after_sdoc_id
                )
            if batch is None:
                break
            after_sdoc_id, sdoc_steps = batch
            for sdoc_id, steps in sdoc_steps.items():
                started = start_steps(
                    project_id=payload.project_id,
                    sdoc_id=sdoc_id,
                    steps=steps,
                    settings=payload.settings,
                    priority=JobPriority.LOW,
                )
                failed += sum(job is None for job in started.values())
            documents += len(sdoc_steps)
            job.update(
                status_message=f"Planned the documents up to {after_sdoc_id} "
                f"of {payload.last_sdoc_id}; started the steps of {documents} "
                f"documents"
            )
        with self.sqlr.transaction() as db:
            self.end_computation(db=db, computation=payload)
        if failed:
            job.update(
                status_message=f"Started the steps of {documents} documents; "
                f"{failed} step jobs could not start, their steps are erroneous"
            )

    def end_computation(
        self, *, db: Session, computation: ArtefactComputationJobInput
    ) -> None:
        """End an artefact computation, done or failed: remove it from the
        project's pending computations, so its artefacts are pending only while
        it runs. Called by the job and by `step_run.handle_job_error`."""
        project = crud_project.read_locked(db=db, id=computation.project_id)
        if not self._is_pending(project=project, computation=computation):
            return
        statements.update_artefact_computation(
            db=db,
            project_id=computation.project_id,
            computation_id=computation.computation_id,
            artefacts=None,
        )

    def _plan_batch(
        self,
        *,
        db: Session,
        computation: ArtefactComputationJobInput,
        after_sdoc_id: int,
    ) -> tuple[int, dict[int, list[JobType]]] | None:
        """Plan the next batch of an artefact computation: the documents after
        `after_sdoc_id` up to the computation's last document, at most
        `COMPUTATION_BATCH_SIZE` (see `_plan_missing_steps`). Its first
        statement locks the project (FOR SHARE), so it waits for a request
        that changes the enabled features.

        Returns the end of the batch and the steps whose inputs are finished
        per document (start them once the transaction commits), or None if no
        document is left."""
        crud_project.read_locked(db=db, id=computation.project_id, shared=True)
        until = statements.read_batch_end(
            db=db,
            project_id=computation.project_id,
            after_sdoc_id=after_sdoc_id,
            last_sdoc_id=computation.last_sdoc_id,
            batch_size=COMPUTATION_BATCH_SIZE,
        )
        if until is None:
            return None
        sdoc_steps = self._plan_missing_steps(
            db=db,
            project_id=computation.project_id,
            artefacts=frozenset(Artefact(a) for a in computation.artefacts),
            sdoc_ids=(after_sdoc_id, until),
        )
        return until, sdoc_steps

    def _is_pending(
        self, *, project: "ProjectORM", computation: ArtefactComputationJobInput
    ) -> bool:
        """Whether the computation is pending in the project: not ended, and its
        request did not roll back after the enqueue."""
        return computation.computation_id in project.artefact_computations

    def _plan_missing_steps(
        self,
        *,
        db: Session,
        project_id: int,
        artefacts: frozenset[Artefact],
        sdoc_ids: tuple[int, int],
    ) -> dict[int, list[JobType]]:
        """Plan for the documents of the project in the id range (after, until]
        the steps of the artefacts and of the core artefacts:

            to_plan = steps_for(core) | (steps_for(artefacts) if they apply)
            to_redo = steps_for(artefacts) if they apply

        The steps of other artefacts are in neither, so this never computes the
        missing data of another feature; a planned step starts only its planned
        successors.

        1) A step of `to_plan` without a row is planned; existing rows keep their
           status.
        2) The erroneous steps of `to_redo` are planned again.
        3) A step of 1) or 2) whose input step is erroneous or not planned is set
           to erroneous: it cannot run, and shows up as failed until its input is
           recomputed (the input then starts it).

        Returns the steps of 1) and 2) whose inputs are finished, per document:
        they can start now, the others start when their inputs finish."""
        graph = artefact_registry.graph()

        sdoc_steps: dict[int, list[JobType]] = {}
        for doctype in DocType:
            own = (
                set(graph.steps_for(doctype, artefacts))
                if graph.applies(doctype, artefacts)
                else set()
            )
            core = set(graph.steps_for(doctype, CORE_ARTEFACTS))
            to_plan = [s for s in graph.steps(doctype) if s in own | core]
            to_redo = [s for s in to_plan if s in own]
            if not to_plan:
                continue

            # lock the documents with steps to plan
            locked = statements.read_sdoc_ids_to_plan(
                db=db,
                project_id=project_id,
                doctype=doctype,
                sdoc_ids=sdoc_ids,
                missing_steps=to_plan,
                redo_steps=to_redo,
            )

            if not locked:
                continue

            # 1) plan the missing steps, 2) and the steps to redo
            planned = statements.create_missing(
                db=db,
                project_id=project_id,
                doctype=doctype,
                sdoc_ids=sdoc_ids,
                steps=to_plan,
            )
            redone = statements.update_to_processing(
                db=db, sdoc_ids=locked, steps=to_redo
            )
            rows = {
                step: step_ids
                for step in to_plan
                if (step_ids := sorted({*planned.get(step, []), *redone.get(step, [])}))
            }

            # 3) fail the steps that cannot run, then read those that can start
            inputs = {step: graph.inputs(doctype, step) for step in to_plan}
            statements.update_blocked_to_erroneous(db=db, rows=rows, inputs=inputs)
            sdoc_steps |= statements.read_startable(db=db, rows=rows, inputs=inputs)

        return sdoc_steps
