from typing import Iterable

from sqlalchemy import ColumnElement, and_, func, or_, select, update
from sqlalchemy.orm import Session

from common.artefact_enum import CORE_ARTEFACTS, Artefact
from common.doc_type_enum import DocType
from common.feature_enum import Feature, FeatureStatus
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from common.singleton_meta import SingletonMeta
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectFeatureRead
from modules.doc_processing.doc_processing_dto import ProcessingSettings
from systems.feature_system.feature_dto import FeatureActivationJobInput, FeatureRead
from systems.feature_system.feature_exceptions import (
    FeatureDisabledError,
    FeatureStillRequiredError,
)
from systems.feature_system.feature_registry import feature_registry
from systems.job_system.job_service import JobService
from systems.job_system.pipeline_graph import (
    UPLOADED_ARTEFACTS,
    PipelineGraph,
    pipeline_registry,
)


class FeatureService(metaclass=SingletonMeta):
    """The features of the projects: which features exist, which a project
    enables, and which pipeline steps its documents need for them.

    Planning: a document gets the steps that produce the core artefacts and the
    artefacts of the enabled features, plus the steps these require. A step whose
    required artefacts cannot be produced for the document's doctype is not planned
    (e.g. the text steps of an image without image captions)."""

    def __new__(cls, *args, **kwargs):
        cls.registry = feature_registry
        cls.js = JobService()
        return super(FeatureService, cls).__new__(cls)

    # --- features

    def read_all(self) -> list[FeatureRead]:
        """All toggleable features, in the order of the `Feature` enum."""
        return [
            FeatureRead(
                feature=d.feature,
                title=d.title,
                description=d.description,
                requires_features=[f for f in Feature if f in d.requires_features],
            )
            for d in self.registry.declarations()
        ]

    def resolve_enabled_features(
        self, *, requested: Iterable[Feature], current: Iterable[Feature] = ()
    ) -> list[Feature]:
        """The features to store as enabled when `requested` are asked for: they
        and the features they require. Rejects disabling a feature of `current`
        that a requested feature requires."""
        requested = frozenset(requested)
        for feature in frozenset(current) - requested:
            required_by = [
                f
                for f in Feature
                if f in requested and feature in self.registry.closure([f]) - {f}
            ]
            if required_by:
                raise FeatureStillRequiredError(
                    feature=feature, required_by=required_by
                )
        enabled = self.registry.closure(requested)
        return [f for f in Feature if f in enabled]

    def disable_feature(
        self, *, db: Session, project_id: int, feature: Feature
    ) -> list[Feature]:
        """Disable the feature in any enabled state: it is hidden and its data is
        not computed anymore; the stored data is kept. Rejects disabling a feature
        that another enabled feature requires. Returns the enabled features.

        Steps that are still processing (an activation or an upload computing the
        feature) and that the remaining features do not need are set to not
        planned: the documents do not stay processing, and step jobs still in the
        queue skip them (`handle_job_started`). Finished and erroneous steps keep
        their status."""
        project = crud_project.read(db=db, id=project_id)
        current = {Feature(f) for f in project.enabled_features}
        enabled = self.resolve_enabled_features(
            requested=current - {feature}, current=current
        )
        crud_project.update_enabled_features(db=db, id=project_id, features=enabled)

        graph = pipeline_registry.graph()
        for doctype in DocType:
            plan = set(self.planned_steps(doctype=doctype, features=enabled))
            crud_sdoc.update_pending_steps_to_not_planned(
                db=db,
                project_id=project_id,
                doctype=doctype,
                steps=[s for s in graph.steps(doctype) if s not in plan],
            )
        return enabled

    def activate_feature(
        self,
        *,
        db: Session,
        project_id: int,
        feature: Feature,
        settings: ProcessingSettings,
    ) -> list[Feature]:
        """Enable the feature, or complete it if it is enabled already: enable it
        and the features it requires, and compute their data for the documents
        that lack it (see `_plan_missing_steps`). A feature activation job on the
        low-priority queue starts the steps with these settings. Returns the
        enabled features."""
        project = crud_project.read(db=db, id=project_id)
        current = {Feature(f) for f in project.enabled_features}
        enabled = self.resolve_enabled_features(
            requested=current | {feature}, current=current
        )
        crud_project.update_enabled_features(db=db, id=project_id, features=enabled)

        sdoc_steps = self._plan_missing_steps(
            db=db, project_id=project_id, feature=feature, enabled=enabled
        )
        if sdoc_steps:
            self.js.start_job(
                JobType.FEATURE_ACTIVATION,
                FeatureActivationJobInput(
                    project_id=project_id, sdoc_steps=sdoc_steps, settings=settings
                ),
            )
        return enabled

    def assert_enabled(self, *, db: Session, project_id: int, feature: Feature) -> None:
        """Raise a `FeatureDisabledError` (403) if the feature is not enabled in
        the project."""
        project = crud_project.read(db=db, id=project_id)
        if feature.value not in project.enabled_features:
            raise FeatureDisabledError(project_id=project_id, feature=feature)

    # --- planning

    def planned_steps(
        self, *, doctype: DocType, features: Iterable[Feature]
    ) -> list[JobType]:
        """The steps to run for a document of this doctype in a project with these
        enabled features, in pipeline order."""
        graph = pipeline_registry.graph()
        return _plan(graph, doctype, self.registry.required_artefacts(features))

    def feature_steps(
        self, *, doctype: DocType, feature: Feature, enabled: Iterable[Feature]
    ) -> list[JobType]:
        """The steps a document of this doctype needs for the feature, in a project
        with these enabled features (with the feature enabled): the producers of
        the feature's artefacts and the steps they require. Empty if the feature
        does not apply to the doctype (e.g. object detection to text documents)."""
        graph = pipeline_registry.graph()
        features = self.registry.closure([feature])
        plan = _plan(
            graph, doctype, self.registry.required_artefacts(set(enabled) | features)
        )
        artefacts = self.registry.required_artefacts(features) - CORE_ARTEFACTS
        producers = _producers(graph, plan)
        if not artefacts or not artefacts <= producers.keys():
            return []
        needed: set[JobType] = set()
        todo = [producers[a] for a in artefacts]
        while todo:
            step = todo.pop()
            if step in needed:
                continue
            needed.add(step)
            todo.extend(
                producers[a] for a in graph.declaration(step).requires if a in producers
            )
        return [s for s in plan if s in needed]

    # --- project features

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
            (feature, doctype): self.feature_steps(
                doctype=doctype, feature=feature, enabled=enabled
            )
            for feature in Feature
            for doctype in DocType
        }

        # 1) one aggregate per doctype, per (doctype, step) and per (doctype, step set)
        sdoc = SourceDocumentORM
        processing = SDocStatus.processing.value
        finished = SDocStatus.finished.value
        erroneous = SDocStatus.erroneous.value
        aggregates: dict[tuple, ColumnElement[int]] = {}

        for (_, doctype), step_set in steps.items():
            if not step_set:
                continue
            is_doctype = sdoc.doctype == doctype.value
            columns = [getattr(sdoc, s.value) for s in step_set]
            # NULL-safe comparisons: a NOT over a NULL comparison would drop the row
            any_processing = or_(*[c.is_not_distinct_from(processing) for c in columns])
            any_erroneous = or_(*[c.is_not_distinct_from(erroneous) for c in columns])
            key = (doctype, tuple(step_set))
            aggregates[("total", doctype)] = func.count().filter(is_doctype)
            aggregates[("ready", *key)] = func.count().filter(
                and_(is_doctype, *[c == finished for c in columns])
            )
            aggregates[("processing", *key)] = func.count().filter(
                and_(is_doctype, any_processing)
            )
            aggregates[("failed", *key)] = func.count().filter(
                and_(is_doctype, ~any_processing, any_erroneous)
            )
            aggregates[("not_planned", *key)] = func.count().filter(
                and_(
                    is_doctype,
                    *[c.is_distinct_from(processing) for c in columns],
                    *[c.is_distinct_from(erroneous) for c in columns],
                    or_(*[c.is_(None) for c in columns]),
                )
            )
            for step, column in zip(step_set, columns):
                aggregates[("missing", doctype, step)] = func.count().filter(
                    and_(is_doctype, column.is_distinct_from(finished))
                )

        counts: dict[tuple, int] = {}
        if aggregates:
            # short labels: Postgres truncates identifiers to 63 characters
            row = db.execute(
                select(
                    *[agg.label(f"a{i}") for i, agg in enumerate(aggregates.values())]
                ).where(sdoc.project_id == project_id)
            ).one()
            counts = dict(zip(aggregates.keys(), row))

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

    def _plan_missing_steps(
        self,
        *,
        db: Session,
        project_id: int,
        feature: Feature,
        enabled: list[Feature],
    ) -> dict[int, list[JobType]]:
        """Plan the steps the feature (and the features it requires) needs for all
        documents of the project: steps that are not planned (NULL) are planned,
        and erroneous steps of the feature are planned again; the steps of other
        features are left alone. Finished and processing steps keep their status.

        A step whose input step is erroneous (or not planned) is set to erroneous:
        it cannot run, and shows up as failed until its input is recomputed (the
        input then starts it). Returns the planned steps whose inputs are finished,
        per document: they can start now, the others start when their inputs
        finish."""
        graph = pipeline_registry.graph()
        table = SourceDocumentORM.__table__
        processing = SDocStatus.processing.value
        finished = SDocStatus.finished.value
        erroneous = SDocStatus.erroneous.value
        features = self.registry.closure([feature])

        sdoc_steps: dict[int, list[JobType]] = {}
        for doctype in DocType:
            plan = self.planned_steps(doctype=doctype, features=enabled)
            to_plan = set(self.planned_steps(doctype=doctype, features=features))
            to_redo = {
                step
                for f in features
                for step in self.feature_steps(
                    doctype=doctype, feature=f, enabled=enabled
                )
            }
            if not plan or not (to_plan or to_redo):
                continue
            producers = _producers(graph, plan)
            inputs = {
                step: [
                    producers[a]
                    for a in graph.declaration(step).requires
                    if a in producers
                ]
                for step in plan
            }

            # 1) lock the documents with steps to plan
            rows = db.execute(
                select(table.c.id, *[table.c[s.value] for s in plan])
                .where(
                    table.c.project_id == project_id,
                    table.c.doctype == doctype.value,
                    or_(
                        *[table.c[s.value].is_(None) for s in plan if s in to_plan],
                        *[table.c[s.value] == erroneous for s in plan if s in to_redo],
                    ),
                )
                .with_for_update()
            ).all()

            # 2) the new status of their steps, in pipeline order
            updates: dict[tuple[tuple[JobType, int], ...], list[int]] = {}
            for row in rows:
                status: dict[JobType, int | None] = dict(zip(plan, row[1:]))
                changed: dict[JobType, int] = {}
                startable: list[JobType] = []
                for step in plan:
                    old = status[step]
                    if not (
                        (old is None and step in to_plan)
                        or (old == erroneous and step in to_redo)
                    ):
                        continue
                    input_status = [status[i] for i in inputs[step]]
                    if any(s is None or s == erroneous for s in input_status):
                        new = erroneous
                    else:
                        new = processing
                        if all(s == finished for s in input_status):
                            startable.append(step)
                    status[step] = new
                    if new != old:
                        changed[step] = new
                if changed:
                    updates.setdefault(tuple(changed.items()), []).append(row[0])
                if startable:
                    sdoc_steps[row[0]] = startable

            # 3) store them, in bulk per combination of changes
            for changes, ids in updates.items():
                db.execute(
                    update(SourceDocumentORM)
                    .where(SourceDocumentORM.id.in_(ids))
                    .values({step.value: value for step, value in changes})
                    .execution_options(synchronize_session=False)
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


def _plan(
    graph: PipelineGraph, doctype: DocType, needed: frozenset[Artefact]
) -> list[JobType]:
    """The steps of the doctype that produce the needed artefacts, plus the steps
    they require. A step that produces optional artefacts runs only if one of them
    is needed; core artefacts it also produces do not make it run (the image
    caption also produces the raw HTML of an image)."""
    order = graph.steps(doctype)

    # 1) select the steps of needed artefacts; optional artefacts that a selected
    # step requires are needed too
    wanted = set(needed)
    while True:
        selected = [s for s in order if _is_selected(graph, s, wanted)]
        more = {
            a for s in selected for a in graph.declaration(s).requires
        } - CORE_ARTEFACTS
        if more <= wanted:
            break
        wanted |= more

    # 2) drop the steps whose required artefacts are not produced, in pipeline
    # order, so the steps after a dropped step are dropped as well
    available = set(UPLOADED_ARTEFACTS.get(doctype, frozenset()))
    planned: list[JobType] = []
    for step in selected:
        declaration = graph.declaration(step)
        if declaration.requires <= available:
            planned.append(step)
            available |= declaration.produces
    return planned


def _is_selected(graph: PipelineGraph, step: JobType, wanted: set[Artefact]) -> bool:
    produces = graph.declaration(step).produces
    optional = produces - CORE_ARTEFACTS
    return bool((optional or produces) & wanted)


def _producers(graph: PipelineGraph, steps: list[JobType]) -> dict[Artefact, JobType]:
    """The step producing each artefact, among these steps of one doctype."""
    return {a: s for s in steps for a in graph.declaration(s).produces}
