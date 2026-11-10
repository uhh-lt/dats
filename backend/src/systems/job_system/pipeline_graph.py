"""The document preprocessing pipeline, derived from the step declarations.

Every pipeline step declares in `@register_job` the artefacts it `requires` and
`produces` and the doctypes it applies to. From these declarations, this module
derives per doctype the steps, their order and which step starts which.
"""

from dataclasses import dataclass

from common.artefact_enum import Artefact
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from systems.job_system.job_exceptions import (
    PipelineDeclarationError,
    PipelineNotRegisteredError,
)

# Artefacts that the uploaded file itself provides, per doctype.
UPLOADED_ARTEFACTS: dict[DocType, frozenset[Artefact]] = {
    DocType.audio: frozenset({Artefact.AUDIO}),
}

_JOB_TYPE_ORDER = {job_type: idx for idx, job_type in enumerate(JobType)}


@dataclass(frozen=True)
class PipelineStep:
    requires: frozenset[Artefact]
    produces: frozenset[Artefact]
    doctypes: frozenset[DocType]


class PipelineGraph:
    """The pipeline derived from the step declarations. Raises a
    `PipelineDeclarationError` listing all problems if the declarations are invalid."""

    def __init__(self, steps: dict[JobType, PipelineStep]) -> None:
        self._steps_by_doctype: dict[DocType, list[JobType]] = {}
        self._roots_by_doctype: dict[DocType, list[JobType]] = {}
        successors_by_doctype: dict[DocType, dict[JobType, list[JobType]]] = {}

        problems = _check_artefacts_produced(steps)
        for doctype in DocType:
            doctype_steps = {jt: s for jt, s in steps.items() if doctype in s.doctypes}
            deps, dep_problems = _dependencies(doctype, doctype_steps)
            problems.extend(dep_problems)
            order = _order(doctype_steps, deps)
            if order is None:
                problems.append(
                    f"The steps of doctype '{doctype.value}' contain a cycle."
                )
                continue
            triggers = _transitive_reduction(order, deps)
            for job_type, predecessors in triggers.items():
                # until steps wait for all their inputs, a step is started once
                # by each of its predecessors
                if len(predecessors) > 1:
                    problems.append(
                        f"Step '{job_type.value}' of doctype '{doctype.value}' would be "
                        f"started by several steps: {sorted(p.value for p in predecessors)}."
                    )
            self._steps_by_doctype[doctype] = order
            self._roots_by_doctype[doctype] = [jt for jt in order if not deps[jt]]
            successors_by_doctype[doctype] = {
                jt: [s for s in order if jt in triggers[s]] for jt in order
            }

        self._successors: dict[JobType, list[JobType]] = {}
        for job_type, step in steps.items():
            per_doctype = {
                doctype: successors_by_doctype[doctype][job_type]
                for doctype in step.doctypes
                if doctype in successors_by_doctype
            }
            if len({tuple(s) for s in per_doctype.values()}) > 1:
                problems.append(
                    f"Step '{job_type.value}' starts different steps per doctype."
                )
            self._successors[job_type] = next(iter(per_doctype.values()), [])

        if problems:
            raise PipelineDeclarationError(problems)

    def steps(self, doctype: DocType) -> list[JobType]:
        """The steps run for a document of this doctype, in a valid order."""
        return self._steps_by_doctype[doctype]

    def roots(self, doctype: DocType) -> list[JobType]:
        """The steps that start when a document of this doctype is created."""
        return self._roots_by_doctype[doctype]

    def successors(self, job_type: JobType) -> list[JobType]:
        """The steps started when this step finished (empty for non-pipeline jobs)."""
        return self._successors.get(job_type, [])

    def edges(self) -> set[tuple[JobType, JobType]]:
        """All (step, successor) pairs."""
        return {(jt, s) for jt, succ in self._successors.items() for s in succ}


def _check_artefacts_produced(steps: dict[JobType, PipelineStep]) -> list[str]:
    produced = {a for s in steps.values() for a in s.produces}
    uploaded = {a for artefacts in UPLOADED_ARTEFACTS.values() for a in artefacts}
    return [
        f"Artefact '{a.value}' is produced by no step."
        for a in Artefact
        if a not in produced and a not in uploaded
    ]


def _dependencies(
    doctype: DocType, steps: dict[JobType, PipelineStep]
) -> tuple[dict[JobType, set[JobType]], list[str]]:
    """The steps each step depends on, i.e. the producers of its required artefacts."""
    problems: list[str] = []
    producers: dict[Artefact, JobType] = {}
    for job_type, step in steps.items():
        for artefact in step.produces:
            if artefact in producers:
                problems.append(
                    f"Artefact '{artefact.value}' of doctype '{doctype.value}' is produced "
                    f"by several steps: '{producers[artefact].value}', '{job_type.value}'."
                )
            producers[artefact] = job_type

    uploaded = UPLOADED_ARTEFACTS.get(doctype, frozenset())
    deps: dict[JobType, set[JobType]] = {jt: set() for jt in steps}
    for job_type, step in steps.items():
        for artefact in step.requires:
            if artefact in uploaded:
                continue
            if artefact not in producers:
                problems.append(
                    f"Step '{job_type.value}' requires artefact '{artefact.value}', which "
                    f"no step produces for doctype '{doctype.value}'."
                )
                continue
            deps[job_type].add(producers[artefact])
    return deps, problems


def _order(
    steps: dict[JobType, PipelineStep], deps: dict[JobType, set[JobType]]
) -> list[JobType] | None:
    """Topological order (None on a cycle). Among the steps that are ready, the
    most doctype-specific step comes first, then the JobType declaration order."""
    order: list[JobType] = []
    remaining = dict(deps)
    while remaining:
        ready = [jt for jt, d in remaining.items() if d.issubset(order)]
        if not ready:
            return None
        nxt = min(ready, key=lambda jt: (len(steps[jt].doctypes), _JOB_TYPE_ORDER[jt]))
        order.append(nxt)
        del remaining[nxt]
    return order


def _transitive_reduction(
    order: list[JobType], deps: dict[JobType, set[JobType]]
) -> dict[JobType, set[JobType]]:
    """The direct predecessors of each step: its dependencies that are not
    already a dependency of another of its dependencies."""
    ancestors: dict[JobType, set[JobType]] = {}
    for job_type in order:
        ancestors[job_type] = set(deps[job_type])
        for dep in deps[job_type]:
            ancestors[job_type] |= ancestors[dep]
    return {
        job_type: {
            dep
            for dep in deps[job_type]
            if not any(dep in ancestors[other] for other in deps[job_type])
        }
        for job_type in order
    }


class PipelineRegistry:
    """Collects the step declarations of `@register_job` and builds the graph
    from them on first use."""

    def __init__(self) -> None:
        self._steps: dict[JobType, PipelineStep] = {}
        self._graph: PipelineGraph | None = None

    def register(self, job_type: JobType, step: PipelineStep) -> None:
        self._steps[job_type] = step
        self._graph = None

    def graph(self) -> PipelineGraph:
        if not self._steps:
            raise PipelineNotRegisteredError()
        if self._graph is None:
            self._graph = PipelineGraph(self._steps)
        return self._graph


pipeline_registry = PipelineRegistry()
