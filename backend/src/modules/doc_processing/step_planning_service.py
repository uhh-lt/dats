from uuid import uuid4

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
from systems.feature_system.feature_exceptions import FeatureDisabledError
from systems.feature_system.feature_registry import feature_registry
from systems.feature_system.feature_service import FeatureService
from systems.job_system.job_service import JobService

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
    start a feature activation job, which plans and starts the steps of the
    project's documents in batches (`plan_activation_batch`), one transaction
    each. The request stores the activation's id as the feature's pending
    activation, which shows the feature as computing until the job removes it
    (`finish_activation`), and starts the job before it commits: the job's
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
        `plan_activation_batch`) on the low-priority queue with these settings.
        A feature with a pending activation gets no second job. Returns the
        project."""
        project = statements.read_project_locked(db=db, project_id=project_id)
        current = {Feature(f) for f in project.enabled_features}
        enabled = self.fs.resolve_enabled_features(
            requested=current | {feature}, current=current
        )
        statements.update_enabled_features(
            db=db, project_id=project_id, features=enabled
        )
        if feature.value not in project.feature_activations:
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

    def plan_activation_batch(
        self,
        *,
        db: Session,
        activation: FeatureActivationJobInput,
        after_sdoc_id: int,
    ) -> tuple[int, dict[int, list[JobType]]] | None:
        """Plan the next batch of a feature activation: the documents after
        `after_sdoc_id` up to the activation's last document, at most
        `ACTIVATION_BATCH_SIZE`, with the features the project enables now (see
        `_plan_missing_steps`). Its first statement locks the project (FOR
        SHARE), so it waits for a request that changes the features and reads
        the committed state.

        Returns the end of the batch and the steps whose inputs are finished per
        document (start them once the transaction commits), or None if the
        activation is over: no document is left, the feature is disabled, or
        the feature's pending activation has another id (a restart or a request
        that rolled back)."""
        project = statements.read_project_locked(
            db=db, project_id=activation.project_id, shared=True
        )
        feature = activation.feature
        if (
            feature.value not in project.enabled_features
            or project.feature_activations.get(feature.value)
            != activation.activation_id
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
        sdoc_steps = self._plan_missing_steps(
            db=db,
            project_id=activation.project_id,
            feature=feature,
            enabled=[Feature(f) for f in project.enabled_features],
            sdoc_ids=(after_sdoc_id, until),
            restart=activation.restart,
        )
        return until, sdoc_steps

    def finish_activation(
        self, *, db: Session, activation: FeatureActivationJobInput
    ) -> None:
        """End a feature activation, done or failed: remove the feature's
        pending activation if it is still this one, so the feature is computing
        only while its documents process."""
        project = statements.read_project_locked(
            db=db, project_id=activation.project_id
        )
        feature = activation.feature
        if project.feature_activations.get(feature.value) != activation.activation_id:
            return
        statements.update_feature_activation(
            db=db, project_id=activation.project_id, feature=feature, activation_id=None
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

    def _plan_missing_steps(
        self,
        *,
        db: Session,
        project_id: int,
        feature: Feature,
        enabled: list[Feature],
        sdoc_ids: tuple[int, int],
        restart: bool,
    ) -> dict[int, list[JobType]]:
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
        they can start now, the others start when their inputs finish."""
        graph = pipeline_registry.graph()
        features = self.registry.closure([feature])
        others = [f for f in enabled if f not in features]

        sdoc_steps: dict[int, list[JobType]] = {}
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

        return sdoc_steps
