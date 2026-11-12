from collections import defaultdict

from sqlalchemy import event
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import Feature, FeatureStatus
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from common.singleton_meta import SingletonMeta
from core.doc.source_document_step_status_crud import crud_sdoc_step_status
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectRead
from modules.doc_processing.doc_processing_dto import (
    FeatureActivationJobInput,
    ProcessingSettings,
)
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.pipeline.step_planning import (
    feature_steps,
    planned_steps,
)
from modules.project_features.project_feature_dto import ProjectFeatureRead
from systems.feature_system.feature_exceptions import FeatureDisabledError
from systems.feature_system.feature_registry import feature_registry
from systems.feature_system.feature_service import FeatureService
from systems.job_system.job_service import JobService


class ProjectFeatureService(metaclass=SingletonMeta):
    """The features of the projects: which features a project enables, plans
    the pipeline steps its documents need for them (see `step_planning`), and
    how far they are computed."""

    def __new__(cls, *args, **kwargs):
        cls.registry = feature_registry
        cls.fs = FeatureService()
        cls.js = JobService()
        return super(ProjectFeatureService, cls).__new__(cls)

    # --- enabled features

    def disable_feature(
        self, *, db: Session, project_id: int, feature: Feature
    ) -> ProjectRead:
        """Disable the feature in any enabled state: it is hidden and its data is
        not computed anymore; the stored data is kept. Rejects disabling a feature
        that another enabled feature requires. Returns the project.

        Steps that are still processing (an activation or an upload computing the
        feature) and that the remaining features do not need are set to not
        planned: the documents do not stay processing, and step jobs still in the
        queue skip them (`handle_job_started`). Finished and erroneous steps keep
        their status."""
        # lock the project: a concurrent change of its features waits for this one
        project = crud_project.read_locked(db=db, id=project_id)
        current = {Feature(f) for f in project.enabled_features}
        enabled = self.fs.resolve_enabled_features(
            requested=current - {feature}, current=current
        )
        crud_project.update_enabled_features(db=db, id=project_id, features=enabled)

        graph = pipeline_registry.graph()
        for doctype in DocType:
            plan = set(planned_steps(doctype=doctype, features=enabled))
            crud_sdoc_step_status.delete_pending_by_project(
                db=db,
                project_id=project_id,
                doctype=doctype,
                steps=[s for s in graph.steps(doctype) if s not in plan],
            )
        return self._read_project(db=db, project_id=project_id)

    def activate_feature(
        self,
        *,
        db: Session,
        project_id: int,
        feature: Feature,
        settings: ProcessingSettings,
    ) -> ProjectRead:
        """Enable the feature, or complete it if it is enabled already: enable it
        and the features it requires, and compute their data for the documents
        that lack it (see `_plan_missing_steps`). A feature activation job on the
        low-priority queue starts the steps with these settings once the
        transaction commits. Returns the project."""
        # lock the project: a concurrent change of its features waits for this one
        project = crud_project.read_locked(db=db, id=project_id)
        current = {Feature(f) for f in project.enabled_features}
        enabled = self.fs.resolve_enabled_features(
            requested=current | {feature}, current=current
        )
        crud_project.update_enabled_features(db=db, id=project_id, features=enabled)

        sdoc_steps = self._plan_missing_steps(
            db=db, project_id=project_id, feature=feature, enabled=enabled
        )
        self._start_steps_after_commit(
            db=db, project_id=project_id, sdoc_steps=sdoc_steps, settings=settings
        )
        return self._read_project(db=db, project_id=project_id)

    def restart_feature(
        self,
        *,
        db: Session,
        project_id: int,
        feature: Feature,
        settings: ProcessingSettings,
    ) -> ProjectRead:
        """Restart the processing of an enabled feature: plan its processing steps
        again, except the core steps (an upload in progress keeps its jobs), and
        start those whose inputs are finished, like `activate_feature` does for
        missing steps. For steps left processing without a job (a crashed
        worker); a step whose job still runs computes twice. Returns the
        project."""
        project = crud_project.read_locked(db=db, id=project_id)
        if feature.value not in project.enabled_features:
            raise FeatureDisabledError(project_id=project_id, feature=feature)
        enabled = [Feature(f) for f in project.enabled_features]

        sdoc_steps = self._plan_missing_steps(
            db=db,
            project_id=project_id,
            feature=feature,
            enabled=enabled,
            restart=True,
        )
        self._start_steps_after_commit(
            db=db, project_id=project_id, sdoc_steps=sdoc_steps, settings=settings
        )
        return self._read_project(db=db, project_id=project_id)

    # --- state of the features

    def read_project_features(
        self, *, db: Session, project_id: int
    ) -> list[ProjectFeatureRead]:
        """The state of every feature in the project. Per feature, each document
        it applies to counts once, by the status of the feature's steps: processing
        if one is processing, else failed if one is erroneous, else not planned if
        one is not planned, else ready. The counts are computed in one aggregate
        query."""
        project = crud_project.read(db=db, id=project_id)
        enabled = {Feature(f) for f in project.enabled_features}

        steps = {
            (feature, doctype): feature_steps(
                doctype=doctype, feature=feature, enabled=enabled
            )
            for feature in Feature
            for doctype in DocType
        }

        # 1) the documents per doctype and combination of step statuses
        graph = pipeline_registry.graph()
        combinations = crud_sdoc_step_status.count_by_project(
            db=db,
            project_id=project_id,
            steps=[s for s in JobType if s in graph.all_steps()],
        )
        processing = SDocStatus.processing
        finished = SDocStatus.finished
        erroneous = SDocStatus.erroneous
        step_sets = {
            (d, tuple(step_set)) for (_, d), step_set in steps.items() if step_set
        }
        counts: dict[tuple, int] = defaultdict(int)
        for doctype, step_status, count in combinations:
            counts[("total", doctype)] += count
            for d, step_set in step_sets:
                if d != doctype:
                    continue
                key = (doctype, step_set)
                status = [step_status.get(step) for step in step_set]
                if all(st == finished for st in status):
                    counts[("ready", *key)] += count
                if processing in status:
                    counts[("processing", *key)] += count
                elif erroneous in status:
                    counts[("failed", *key)] += count
                elif None in status:
                    counts[("not_planned", *key)] += count
            for step in {
                s for d, step_set in step_sets if d == doctype for s in step_set
            }:
                if step_status.get(step) != finished:
                    counts[("missing", doctype, step)] += count

        # 2) sum up per feature
        result: list[ProjectFeatureRead] = []
        for feature in Feature:
            total = ready = running = failed = not_planned = 0
            missing: set[JobType] = set()
            for doctype in DocType:
                step_set = steps[(feature, doctype)]
                if not step_set:
                    continue
                key = (doctype, tuple(step_set))
                total += counts[("total", doctype)]
                ready += counts[("ready", *key)]
                running += counts[("processing", *key)]
                failed += counts[("failed", *key)]
                not_planned += counts[("not_planned", *key)]
                missing |= {s for s in step_set if counts[("missing", doctype, s)] > 0}
            result.append(
                ProjectFeatureRead(
                    feature=feature,
                    enabled=feature in enabled,
                    status=_status(
                        enabled=feature in enabled,
                        processing=running,
                        lacking=failed + not_planned,
                    ),
                    ready=ready == total,
                    covered_documents=ready,
                    processing_documents=running,
                    failed_documents=failed,
                    not_planned_documents=not_planned,
                    total_documents=total,
                    missing_steps=[s for s in JobType if s in missing],
                )
            )
        return result

    def _read_project(self, *, db: Session, project_id: int) -> ProjectRead:
        return ProjectRead.model_validate(crud_project.read(db=db, id=project_id))

    def _start_steps_after_commit(
        self,
        *,
        db: Session,
        project_id: int,
        sdoc_steps: dict[int, list[JobType]],
        settings: ProcessingSettings,
    ) -> None:
        """Start a feature activation job for the planned steps once the
        transaction commits: a step job that starts earlier reads its steps as not
        planned and is skipped."""
        if not sdoc_steps:
            return
        job_input = FeatureActivationJobInput(
            project_id=project_id, sdoc_steps=sdoc_steps, settings=settings
        )
        event.listen(
            db,
            "after_commit",
            lambda _session: self.js.start_job(JobType.FEATURE_ACTIVATION, job_input),
            once=True,
        )

    def _plan_missing_steps(
        self,
        *,
        db: Session,
        project_id: int,
        feature: Feature,
        enabled: list[Feature],
        restart: bool = False,
    ) -> dict[int, list[JobType]]:
        """Plan for all documents of the project the steps that the feature (with
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
            sdoc_ids = crud_sdoc_step_status.read_sdoc_ids_to_plan(
                db=db,
                project_id=project_id,
                doctype=doctype,
                missing_steps=to_plan,
                redo_steps={
                    SDocStatus.erroneous: to_redo,
                    SDocStatus.processing: to_restart,
                },
            )

            if not sdoc_ids:
                continue

            # 1) plan the missing steps, 2) and the feature's steps to redo
            planned = crud_sdoc_step_status.create_missing(
                db=db, project_id=project_id, doctype=doctype, steps=to_plan
            )
            redone = crud_sdoc_step_status.update_to_processing(
                db=db, sdoc_ids=sdoc_ids, steps=to_redo, statuses=[SDocStatus.erroneous]
            )
            restarted = crud_sdoc_step_status.update_to_processing(
                db=db,
                sdoc_ids=sdoc_ids,
                steps=to_restart,
                statuses=[SDocStatus.processing],
            )
            rows = {
                step: planned.get(step, [])
                + redone.get(step, [])
                + restarted.get(step, [])
                for step in plan
                if planned.get(step) or redone.get(step) or restarted.get(step)
            }

            # 3) fail the steps that cannot run, then read those that can start
            inputs = {step: graph.inputs(doctype, step) for step in plan}
            crud_sdoc_step_status.update_blocked_to_erroneous(
                db=db, rows=rows, inputs=inputs
            )
            sdoc_steps |= crud_sdoc_step_status.read_startable(
                db=db, rows=rows, inputs=inputs
            )

        return sdoc_steps


def _status(*, enabled: bool, processing: int, lacking: int) -> FeatureStatus:
    """The status of a feature from the counts of its documents."""
    if not enabled:
        return FeatureStatus.DISABLED
    if processing > 0:
        return FeatureStatus.COMPUTING
    if lacking > 0:
        return FeatureStatus.PARTLY_AVAILABLE
    return FeatureStatus.FULLY_AVAILABLE
