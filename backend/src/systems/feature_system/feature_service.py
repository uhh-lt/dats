from typing import Iterable

from sqlalchemy import ColumnElement, and_, func, or_, select, update
from sqlalchemy.orm import Session

from common.artefact_enum import CORE_ARTEFACTS, Artefact
from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from common.singleton_meta import SingletonMeta
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectFeatureRead
from systems.feature_system.feature_dto import FeatureActivationJobInput, FeatureRead
from systems.feature_system.feature_exceptions import (
    FeatureDisabledError,
    FeatureStillRequiredError,
)
from systems.feature_system.feature_registry import feature_registry
from systems.job_system.job_dto import Job
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
        """The state of every feature in the project. The coverage counts, per
        feature, the documents it applies to and those with all its steps finished;
        both are computed in one aggregate query."""
        project = crud_project.read(db=db, id=project_id)
        enabled = {Feature(f) for f in project.enabled_features}

        steps = {
            (feature, doctype): self.feature_steps(
                doctype=doctype, feature=feature, enabled=enabled
            )
            for feature in Feature
            for doctype in DocType
        }

        # 1) one aggregate per doctype, per (doctype, step) and per step set
        sdoc = SourceDocumentORM
        finished = SDocStatus.finished.value
        aggregates: dict[str, ColumnElement[int]] = {}

        def is_doctype(doctype: DocType) -> ColumnElement[bool]:
            return sdoc.doctype == doctype.value

        def total_key(doctype: DocType) -> str:
            return f"total_{doctype.value}"

        def missing_key(doctype: DocType, step: JobType) -> str:
            return f"missing_{doctype.value}_{step.value}"

        def covered_key(doctype: DocType, step_set: list[JobType]) -> str:
            return f"covered_{doctype.value}_" + "_".join(s.value for s in step_set)

        for (_, doctype), step_set in steps.items():
            if not step_set:
                continue
            aggregates[total_key(doctype)] = func.count().filter(is_doctype(doctype))
            aggregates[covered_key(doctype, step_set)] = func.count().filter(
                and_(
                    is_doctype(doctype),
                    *[getattr(sdoc, s.value) == finished for s in step_set],
                )
            )
            for step in step_set:
                aggregates[missing_key(doctype, step)] = func.count().filter(
                    and_(
                        is_doctype(doctype),
                        getattr(sdoc, step.value).is_distinct_from(finished),
                    )
                )

        counts: dict[str, int] = {}
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
            total = covered = 0
            missing: set[JobType] = set()
            for doctype in DocType:
                step_set = steps[(feature, doctype)]
                if not step_set:
                    continue
                total += counts[total_key(doctype)]
                covered += counts[covered_key(doctype, step_set)]
                missing |= {s for s in step_set if counts[missing_key(doctype, s)] > 0}
            result.append(
                ProjectFeatureRead(
                    feature=feature,
                    enabled=feature in enabled,
                    ready=covered == total,
                    covered_documents=covered,
                    total_documents=total,
                    missing_steps=[s for s in JobType if s in missing],
                )
            )
        return result

    def activate_missing_steps(
        self, *, db: Session, project_id: int, enabled: Iterable[Feature]
    ) -> Job | None:
        """Plan the steps the enabled features need for all documents of the
        project: set the steps that are not planned (NULL) to processing, in bulk
        per doctype. Steps that are planned already keep their status and data.

        The newly planned steps whose inputs are finished are started by a
        feature activation job, on the low-priority queue; the others start
        when their inputs finish. Returns that job, or None if there is nothing
        to start."""
        graph = pipeline_registry.graph()
        table = SourceDocumentORM.__table__
        processing = SDocStatus.processing.value
        finished = SDocStatus.finished.value

        sdoc_steps: dict[int, list[JobType]] = {}
        for doctype in DocType:
            plan = self.planned_steps(doctype=doctype, features=enabled)
            if not plan:
                continue
            columns = [table.c[s.value] for s in plan]

            # 1) lock the documents with steps to plan, remember which were NULL
            old = (
                select(
                    table.c.id,
                    *[c.is_(None).label(f"new_{c.name}") for c in columns],
                )
                .where(
                    table.c.project_id == project_id,
                    table.c.doctype == doctype.value,
                    or_(*[c.is_(None) for c in columns]),
                )
                .with_for_update()
                .cte("old")
            )
            # 2) plan them, keeping the status of the planned ones
            rows = db.execute(
                update(SourceDocumentORM)
                .where(SourceDocumentORM.id == old.c.id)
                .values({c.name: func.coalesce(c, processing) for c in columns})
                .returning(
                    table.c.id,
                    *[old.c[f"new_{c.name}"] for c in columns],
                    *columns,
                )
                .execution_options(synchronize_session=False)
            ).all()

            # 3) the new steps whose inputs are finished can start now
            producers = _producers(graph, plan)
            inputs = {
                step: {
                    producers[a]
                    for a in graph.declaration(step).requires
                    if a in producers
                }
                for step in plan
            }
            for row in rows:
                sdoc_id = row[0]
                is_new = dict(zip(plan, row[1 : 1 + len(plan)]))
                status = dict(zip(plan, row[1 + len(plan) :]))
                startable = [
                    step
                    for step in plan
                    if is_new[step] and all(status[i] == finished for i in inputs[step])
                ]
                if startable:
                    sdoc_steps[sdoc_id] = startable

        if not sdoc_steps:
            return None
        return self.js.start_job(
            JobType.FEATURE_ACTIVATION,
            FeatureActivationJobInput(project_id=project_id, sdoc_steps=sdoc_steps),
        )


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
