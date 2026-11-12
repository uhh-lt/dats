from typing import TYPE_CHECKING
from uuid import uuid4

from loguru import logger
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from common.singleton_meta import SingletonMeta
from config import conf
from core.doc.source_document_step_status_crud import crud_sdoc_step_status
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectRead
from modules.doc_processing import step_planning_statements as statements
from modules.doc_processing.doc_processing_dto import (
    FeatureActivationJobInput,
    ProcessingSettings,
)
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.pipeline.step_planning import (
    feature_steps,
    planned_steps,
)
from modules.doc_processing.step_run import start_steps
from repos.db.sql_repo import SQLRepo
from systems.feature_system.feature_exceptions import (
    FeatureActivationPendingError,
    FeatureDisabledError,
)
from systems.feature_system.feature_registry import feature_registry
from systems.feature_system.feature_service import FeatureService
from systems.job_system.job_dto import Job
from systems.job_system.job_exceptions import JobQueueUnavailableError
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobPriority

if TYPE_CHECKING:
    from core.project.project_orm import ProjectORM

# documents a feature activation plans per transaction (the longest lock hold)
ACTIVATION_BATCH_SIZE = conf.feature_activation.batch_size


class StepPlanningService(metaclass=SingletonMeta):
    """Step planning: which pipeline steps the documents of a project get a step
    status for, from the features the project enables. Its operations are the
    only code that plans steps (adds or changes the status rows of a planning)
    and changes `project.enabled_features` and `project.feature_activations`.
    The SQL statements of the planning (the project and document locks, the
    planning rows, the enabled features and the pending activations) are its
    own, in `step_planning_statements.py`, which only this service imports.

    Enabling, completing and restarting a feature only change the project and
    start a feature activation job, which runs the activation
    (`handle_feature_activation_job`): it plans and starts the steps of the
    project's documents in batches, one transaction each. The request stores
    the activation's id as the feature's pending activation, which shows the
    feature as computing until the activation removes it, and starts the job
    before it commits: the job's
    first statement in every batch is a share lock on the project, which waits
    until the request's lock is released, so the job reads the committed
    state. If the enqueue fails, the request rolls back; if the request rolls
    back after the enqueue, the job finds no pending activation with its id
    and stops.

    Lock order: every operation first locks the project row (FOR NO KEY UPDATE
    to change the features or the pending activations, FOR SHARE to plan a new
    document or a batch of an activation), then the documents it plans, in
    ascending id order (FOR NO KEY UPDATE). A change of the features waits for
    the batch in progress, an upload and a batch plan side by side (the upload
    plans a new document, which is not in the batch), and a status change of a
    document waits for the planning of that document, so the planning never
    misses a step that finishes while it plans. A writer outside this order
    could deadlock or lose a planning without any test failing.

    Known gaps, accepted for now (docs/development/feature-toggles-plan.md):
    - A step that commits finished just before a planning can start a successor
      that the planning starts too; it computes twice.
    - If the worker running an activation job dies, the feature stays computing
      until a user restarts it.
    - `handle_job_started` reads and sets a job's steps in two transactions, so
      a disable in between is undone for that document."""

    def __new__(cls, *args, **kwargs):
        cls.registry = feature_registry
        cls.fs = FeatureService()
        cls.js = JobService()
        cls.sqlr = SQLRepo()
        return super(StepPlanningService, cls).__new__(cls)

    def enable_feature(
        self,
        *,
        db: Session,
        project_id: int,
        feature: Feature,
        settings: ProcessingSettings,
    ) -> ProjectRead:
        """Enable the feature, or complete it if it is enabled already: enable it
        and the features it requires, and start a feature activation job that
        computes their data for the documents that lack it (see
        `_plan_activation_batch`) on the low-priority queue with these settings.
        Rejects a feature with a pending activation: a restart computes it with
        other settings. A feature it requires may have one. Returns the
        project."""
        project = statements.read_project_locked(db=db, project_id=project_id)
        if feature.value in project.feature_activations:
            raise FeatureActivationPendingError(project_id=project_id, feature=feature)
        current = {Feature(f) for f in project.enabled_features}
        enabled = self.fs.resolve_enabled_features(
            requested=current | {feature}, current=current
        )
        statements.update_enabled_features(
            db=db, project_id=project_id, features=enabled
        )
        self._start_activation(
            db=db,
            project_id=project_id,
            feature=feature,
            restart=False,
            settings=settings,
        )
        return ProjectRead.model_validate(crud_project.read(db=db, id=project_id))

    def restart_feature(
        self,
        *,
        db: Session,
        project_id: int,
        feature: Feature,
        settings: ProcessingSettings,
    ) -> ProjectRead:
        """Restart the processing of an enabled feature: start a feature
        activation job that plans its processing steps again, except the core
        steps (an upload in progress keeps its jobs), and starts those whose
        inputs are finished, like `enable_feature` does for missing steps. For
        steps left processing without a job (a crashed worker); a step whose job
        still runs computes twice. A pending activation of the feature stops at
        its next batch. Rejects a disabled feature. Returns the project."""
        project = statements.read_project_locked(db=db, project_id=project_id)
        if feature.value not in project.enabled_features:
            raise FeatureDisabledError(project_id=project_id, feature=feature)
        self._start_activation(
            db=db,
            project_id=project_id,
            feature=feature,
            restart=True,
            settings=settings,
        )
        return ProjectRead.model_validate(crud_project.read(db=db, id=project_id))

    def disable_feature(
        self, *, db: Session, project_id: int, feature: Feature
    ) -> ProjectRead:
        """Disable the feature in any enabled state: it is hidden and its data is
        not computed anymore; the stored data is kept. Rejects disabling a feature
        that another enabled feature requires.

        Steps that are still processing (an activation or an upload computing the
        feature) and that the remaining features do not need are set to not
        planned: the documents do not stay processing, and step jobs still in the
        queue skip them (`handle_job_started`). A pending activation of the
        feature stops at its next batch. Finished and erroneous steps keep their
        status. Returns the project."""
        project = statements.read_project_locked(db=db, project_id=project_id)
        current = {Feature(f) for f in project.enabled_features}
        enabled = self.fs.resolve_enabled_features(
            requested=current - {feature}, current=current
        )
        statements.update_enabled_features(
            db=db, project_id=project_id, features=enabled
        )
        statements.update_feature_activation(
            db=db, project_id=project_id, feature=feature, activation_id=None
        )

        graph = pipeline_registry.graph()
        for doctype in DocType:
            plan = set(planned_steps(doctype=doctype, features=enabled))
            statements.delete_pending_by_project(
                db=db,
                project_id=project_id,
                doctype=doctype,
                steps=[s for s in graph.steps(doctype) if s not in plan],
            )
        return ProjectRead.model_validate(crud_project.read(db=db, id=project_id))

    def add_features(
        self, *, db: Session, project_id: int, features: list[Feature]
    ) -> list[Feature]:
        """Enable the features and the features they require in addition to the
        enabled ones, without planning any step (a project import: features whose
        data is missing are partly available until a user completes them).
        Returns the enabled features."""
        project = statements.read_project_locked(db=db, project_id=project_id)
        current = {Feature(f) for f in project.enabled_features}
        enabled = self.fs.resolve_enabled_features(
            requested=current | set(features), current=current
        )
        statements.update_enabled_features(
            db=db, project_id=project_id, features=enabled
        )
        return enabled

    def plan_new_document(
        self, *, db: Session, project_id: int, sdoc_id: int, doctype: DocType
    ) -> None:
        """Plan the steps the project's features need for a new document of this
        doctype, so the document is never seen as finished; the other steps stay
        not planned. The share lock on the project makes a concurrent feature
        change wait for this upload, so it plans its steps for this document too,
        or this upload plans them for it."""
        project = statements.read_project_locked(
            db=db, project_id=project_id, shared=True
        )
        steps = planned_steps(
            doctype=doctype,
            features=[Feature(f) for f in project.enabled_features],
        )
        crud_sdoc_step_status.update_status(
            db=db,
            sdoc_ids=[sdoc_id],
            steps=steps,
            status=SDocStatus.processing,
        )

    def handle_feature_activation_job(
        self, *, job: Job, payload: FeatureActivationJobInput
    ) -> None:
        """Run a feature activation: plan and start the steps that enabling,
        completing or restarting a feature needs for the project's documents up
        to its last document, in batches of documents with one transaction each
        (`_plan_activation_batch`), on the low-priority queue with the settings
        chosen by the user. After each batch commits, its steps whose inputs are
        finished start, enriched like a recompute; the steps after them start
        through the normal advancing. A step job whose input data is missing
        sets its steps and the pending steps after them to erroneous, like a
        failed job, and the other documents still start.

        If the queue cannot be reached, the activation stops and fails with
        that cause: the batch undoes its own change for the steps it could not
        start and the batch's steps after them (`_undo_batch`), so the feature
        reads partly available and Complete plans them again.

        The activation stops when the feature is disabled or another activation
        of it replaces this one. At the end, also when it fails, it removes the
        feature's pending activation (`_finish_activation`), so the feature
        reads partly available and Complete plans the documents it did not
        reach. It opens its transactions itself: one commit per batch, so no
        lock is held longer than a batch."""
        logger.info(
            f"Planning {payload.feature.value} for the documents of project "
            f"{payload.project_id} up to {payload.last_sdoc_id}..."
        )
        graph = pipeline_registry.graph()
        after_sdoc_id = 0
        documents = 0
        failed = 0
        try:
            while True:
                with self.sqlr.transaction() as db:
                    batch = self._plan_activation_batch(
                        db=db, activation=payload, after_sdoc_id=after_sdoc_id
                    )
                if batch is None:
                    break
                after_sdoc_id, sdoc_steps, change = batch
                # one start per job, so a failure knows which steps did not start
                starts = [
                    (sdoc_id, job_steps)
                    for sdoc_id, steps in sdoc_steps.items()
                    for job_steps in graph.group_by_job(steps).values()
                ]
                for i, (sdoc_id, job_steps) in enumerate(starts):
                    try:
                        started = start_steps(
                            project_id=payload.project_id,
                            sdoc_id=sdoc_id,
                            steps=job_steps,
                            settings=payload.settings,
                            priority=JobPriority.LOW,
                        )
                    except JobQueueUnavailableError:
                        with self.sqlr.transaction() as db:
                            self._undo_batch(
                                db=db,
                                activation=payload,
                                change=change,
                                unstarted=starts[i:],
                            )
                        raise
                    failed += sum(job is None for job in started.values())
                documents += len(sdoc_steps)
                job.update(
                    status_message=f"Planned the documents up to {after_sdoc_id} "
                    f"of {payload.last_sdoc_id}; started the steps of {documents} "
                    f"documents"
                )
        finally:
            with self.sqlr.transaction() as db:
                self._finish_activation(db=db, activation=payload)
        if failed:
            job.update(
                status_message=f"Started the steps of {documents} documents; "
                f"{failed} step jobs could not start, their steps are erroneous"
            )

    def _start_activation(
        self,
        *,
        db: Session,
        project_id: int,
        feature: Feature,
        restart: bool,
        settings: ProcessingSettings,
    ) -> None:
        """Store a new pending activation of the feature and start its feature
        activation job for the project's documents, before the transaction
        commits (see the class docstring). A project without documents needs
        none."""
        last_sdoc_id = statements.read_last_sdoc_id(db=db, project_id=project_id)
        if last_sdoc_id is None:
            return
        activation_id = uuid4().hex
        statements.update_feature_activation(
            db=db, project_id=project_id, feature=feature, activation_id=activation_id
        )
        self.js.start_job(
            JobType.FEATURE_ACTIVATION,
            FeatureActivationJobInput(
                project_id=project_id,
                feature=feature,
                restart=restart,
                settings=settings,
                activation_id=activation_id,
                last_sdoc_id=last_sdoc_id,
            ),
        )

    def _plan_activation_batch(
        self,
        *,
        db: Session,
        activation: FeatureActivationJobInput,
        after_sdoc_id: int,
    ) -> tuple[int, dict[int, list[JobType]], statements.PlanningChange] | None:
        """Plan the next batch of a feature activation: the documents after
        `after_sdoc_id` up to the activation's last document, at most
        `ACTIVATION_BATCH_SIZE`, with the features the project enables now (see
        `_plan_missing_steps`). Its first statement locks the project (FOR
        SHARE), so it waits for a request that changes the features and reads
        the committed state.

        Returns the end of the batch, the steps whose inputs are finished per
        document (start them once the transaction commits) and the rows the
        batch can undo (`_undo_batch`), or None if the
        activation is over: no document is left, the feature is disabled, or
        the feature's pending activation has another id (a restart or a request
        that rolled back)."""
        project = statements.read_project_locked(
            db=db, project_id=activation.project_id, shared=True
        )
        feature = activation.feature
        if feature.value not in project.enabled_features or not self._is_pending(
            project=project, activation=activation
        ):
            return None
        until = statements.read_batch_end(
            db=db,
            project_id=activation.project_id,
            after_sdoc_id=after_sdoc_id,
            last_sdoc_id=activation.last_sdoc_id,
            batch_size=ACTIVATION_BATCH_SIZE,
        )
        if until is None:
            return None
        sdoc_steps, change = self._plan_missing_steps(
            db=db,
            project_id=activation.project_id,
            feature=feature,
            enabled=[Feature(f) for f in project.enabled_features],
            sdoc_ids=(after_sdoc_id, until),
            restart=activation.restart,
        )
        return until, sdoc_steps, change

    def _finish_activation(
        self, *, db: Session, activation: FeatureActivationJobInput
    ) -> None:
        """End a feature activation, done or failed: remove the feature's
        pending activation if it is still this one, so the feature is computing
        only while its documents process."""
        project = statements.read_project_locked(
            db=db, project_id=activation.project_id
        )
        if not self._is_pending(project=project, activation=activation):
            return
        statements.update_feature_activation(
            db=db,
            project_id=activation.project_id,
            feature=activation.feature,
            activation_id=None,
        )

    def _undo_batch(
        self,
        *,
        db: Session,
        activation: FeatureActivationJobInput,
        change: statements.PlanningChange,
        unstarted: list[tuple[int, list[JobType]]],
    ) -> None:
        """Undo the change of a committed batch for the steps it could not start
        (the queue cannot be reached), per document, and for the batch's rows
        after them: a row the batch created is removed, a row it set from
        erroneous to processing is erroneous again (it may be a core step, which
        must not read finished), and a row a restart planned again stays
        processing, as it was before. A row of the batch that waits for an input
        step outside the batch stays as it is: that input starts it. Only rows
        that are still processing change. Takes the project lock (FOR SHARE)
        and then the documents, like a batch, and does nothing if the
        activation is not the feature's pending one anymore."""
        project = statements.read_project_locked(
            db=db, project_id=activation.project_id, shared=True
        )
        if not self._is_pending(project=project, activation=activation):
            return
        graph = pipeline_registry.graph()
        undo: dict[int, set[JobType]] = {}
        for sdoc_id, steps in unstarted:
            undo.setdefault(sdoc_id, set()).update(steps, graph.descendants(steps))

        def unstarted_rows(rows: statements.StepRows) -> statements.StepRows:
            return {
                step: [i for i in sdoc_ids if step in undo.get(i, set())]
                for step, sdoc_ids in rows.items()
            }

        statements.undo_planning(
            db=db,
            change=statements.PlanningChange(
                created=unstarted_rows(change.created),
                redone=unstarted_rows(change.redone),
            ),
        )

    def _is_pending(
        self, *, project: "ProjectORM", activation: FeatureActivationJobInput
    ) -> bool:
        """Whether the activation is the feature's pending activation: not
        replaced by a restart, removed by a disable, or never committed (the
        request rolled back after the enqueue)."""
        return (
            project.feature_activations.get(activation.feature.value)
            == activation.activation_id
        )

    def _plan_missing_steps(
        self,
        *,
        db: Session,
        project_id: int,
        feature: Feature,
        enabled: list[Feature],
        sdoc_ids: tuple[int, int],
        restart: bool,
    ) -> tuple[dict[int, list[JobType]], statements.PlanningChange]:
        """Plan for the documents of the project in the id range (after, until]
        the steps that the feature (with
        the features it requires) adds to the enabled plan, its own steps and the
        core steps:

            to_plan = (plan(enabled) - plan(enabled without the feature))
                      | steps(feature) | plan(no features)

        The first part holds the steps the feature makes possible (the text
        steps of an image once it has a caption). The steps that only other
        features need are in none of the parts, so this never computes the
        missing data of another feature; a planned step starts only its planned
        successors.

        1) A step of `to_plan` without a row is planned; existing rows keep their
           status.
        2) The feature's erroneous steps are planned again; with `restart`, its
           processing steps too, except the core steps (an upload in progress
           keeps its jobs).
        3) A step of 1) or 2) whose input step is erroneous or not planned is set
           to erroneous: it cannot run, and shows up as failed until its input is
           recomputed (the input then starts it).

        Returns the steps of 1) and 2) whose inputs are finished, per document:
        they can start now, the others start when their inputs finish; and the
        rows of 1) and of 2) without the restart, to undo them."""
        graph = pipeline_registry.graph()
        features = self.registry.closure([feature])
        others = [f for f in enabled if f not in features]

        sdoc_steps: dict[int, list[JobType]] = {}
        change = statements.PlanningChange(created={}, redone={})
        for doctype in DocType:
            plan = planned_steps(doctype=doctype, features=enabled)
            without = set(planned_steps(doctype=doctype, features=others))
            own = {
                step
                for f in features
                for step in feature_steps(doctype=doctype, feature=f, enabled=enabled)
            }
            core = set(planned_steps(doctype=doctype, features=[]))
            to_plan = [s for s in plan if s not in without or s in own | core]
            to_redo = [s for s in plan if s in own]
            # a restart runs the feature's own processing steps again, never the
            # core ones: a document still being uploaded keeps its jobs (a
            # second extract_html would extract its images twice)
            to_restart = [s for s in to_redo if s not in core] if restart else []
            if not to_plan:
                continue

            # lock the documents with steps to plan
            locked = statements.read_sdoc_ids_to_plan(
                db=db,
                project_id=project_id,
                doctype=doctype,
                sdoc_ids=sdoc_ids,
                missing_steps=to_plan,
                redo_steps={
                    SDocStatus.erroneous: to_redo,
                    SDocStatus.processing: to_restart,
                },
            )

            if not locked:
                continue

            # 1) plan the missing steps, 2) and the feature's steps to redo
            planned = statements.create_missing(
                db=db,
                project_id=project_id,
                doctype=doctype,
                sdoc_ids=sdoc_ids,
                steps=to_plan,
            )
            redone = statements.update_to_processing(
                db=db, sdoc_ids=locked, steps=to_redo, statuses=[SDocStatus.erroneous]
            )
            restarted = statements.update_to_processing(
                db=db,
                sdoc_ids=locked,
                steps=to_restart,
                statuses=[SDocStatus.processing],
            )
            for rows, changed in ((change.created, planned), (change.redone, redone)):
                for step, step_ids in changed.items():
                    rows.setdefault(step, []).extend(step_ids)
            # a restart also matches the rows it has just planned (processing)
            rows = {
                step: step_ids
                for step in plan
                if (
                    step_ids := sorted(
                        {
                            *planned.get(step, []),
                            *redone.get(step, []),
                            *restarted.get(step, []),
                        }
                    )
                )
            }

            # 3) fail the steps that cannot run, then read those that can start
            inputs = {step: graph.inputs(doctype, step) for step in plan}
            statements.update_blocked_to_erroneous(db=db, rows=rows, inputs=inputs)
            sdoc_steps |= statements.read_startable(db=db, rows=rows, inputs=inputs)

        return sdoc_steps, change
