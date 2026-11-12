"""The document preprocessing pipeline, derived from the step declarations.

Every pipeline step declares in `@pipeline_step` the artefacts it `requires` and
`produces` and the doctypes it applies to. From these declarations, this module
derives per doctype the steps, their order and which step starts which.

A job can compute several steps in one run (`text_spacy` also computes keywords,
word frequencies and named entities). Each step has its own status row and
artefacts; the job input says which of its steps to compute.
"""

from dataclasses import dataclass

from common.artefact_enum import Artefact
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from core.doc.source_document_step_status_crud import MAX_COUNTED_STEPS
from modules.doc_processing.doc_processing_exceptions import (
    PipelineDeclarationError,
    PipelineNotRegisteredError,
)

# Artefacts that the uploaded file itself provides, per doctype.
UPLOADED_ARTEFACTS: dict[DocType, frozenset[Artefact]] = {
    DocType.audio: frozenset({Artefact.AUDIO}),
}


def _job_type_order(job_type: JobType) -> int:
    """The position of the job type in `JobType`, which breaks ties in the step
    order. Read when the graph is built, so it knows every `JobType` value."""
    return list(JobType).index(job_type)


@dataclass(frozen=True)
class PipelineStep:
    requires: frozenset[Artefact]
    produces: frozenset[Artefact]
    doctypes: frozenset[DocType]
    # the job that computes this step, if it is a further step of another job
    job: JobType | None = None


class PipelineGraph:
    """The pipeline derived from the step declarations. Raises a
    `PipelineDeclarationError` listing all problems if the declarations are invalid."""

    def __init__(self, steps: dict[JobType, PipelineStep]) -> None:
        self._declarations = dict(steps)
        self._job_of = {jt: s.job or jt for jt, s in steps.items()}
        self._steps_of_job: dict[JobType, list[JobType]] = {}
        for job_type in sorted(steps, key=_job_type_order):
            self._steps_of_job.setdefault(self._job_of[job_type], []).append(job_type)
        self._steps_by_doctype: dict[DocType, list[JobType]] = {}
        self._roots_by_doctype: dict[DocType, list[JobType]] = {}
        successors_by_doctype: dict[DocType, dict[JobType, list[JobType]]] = {}

        problems = _check_artefacts_produced(steps) + _check_jobs(steps)
        if len(steps) > MAX_COUNTED_STEPS:
            problems.append(
                f"There are {len(steps)} pipeline steps, but the feature states "
                f"count at most {MAX_COUNTED_STEPS} (one bit each in a BIGINT, see "
                f"crud_sdoc_step_status.count_by_project)."
            )
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

    def all_steps(self) -> frozenset[JobType]:
        """The steps of every doctype."""
        return frozenset(self._declarations)

    def declaration(self, step: JobType) -> PipelineStep:
        """The declaration of this step: what it requires, produces and its doctypes."""
        return self._declarations[step]

    def artefacts(self) -> frozenset[Artefact]:
        """All artefacts a step produces or an uploaded file provides."""
        return frozenset(
            {a for s in self._declarations.values() for a in s.produces}
            | {a for artefacts in UPLOADED_ARTEFACTS.values() for a in artefacts}
        )

    def producer(self, doctype: DocType, artefact: Artefact) -> JobType | None:
        """The step of this doctype that produces the artefact, None if no step
        of the doctype does (e.g. image embeddings of a text document)."""
        for step in self.steps(doctype):
            if artefact in self._declarations[step].produces:
                return step
        return None

    def roots(self, doctype: DocType) -> list[JobType]:
        """The steps that start when a document of this doctype is created."""
        return self._roots_by_doctype[doctype]

    def successors(self, job_type: JobType) -> list[JobType]:
        """The steps started when this step finished (empty for non-pipeline jobs)."""
        return self._successors.get(job_type, [])

    def edges(self) -> set[tuple[JobType, JobType]]:
        """All (step, successor) pairs."""
        return {(jt, s) for jt, succ in self._successors.items() for s in succ}

    def job(self, step: JobType) -> JobType:
        """The job that computes this step (the step itself for most steps)."""
        return self._job_of.get(step, step)

    def job_steps(
        self, job_type: JobType, requested: list[JobType] | None = None
    ) -> list[JobType]:
        """The steps a run of this job computes: the requested ones, or all steps
        of the job if None. Raises if a requested step is no step of the job."""
        steps = self._steps_of_job.get(job_type, [job_type])
        if requested is None:
            return steps
        foreign = [s.value for s in requested if s not in steps]
        if foreign:
            raise PipelineDeclarationError(
                [f"Job '{job_type.value}' does not compute the steps {foreign}."]
            )
        return [s for s in steps if s in requested]

    def next_jobs(self, steps: list[JobType]) -> dict[JobType, list[JobType]]:
        """The jobs to start after these steps finished, with the steps each job
        computes."""
        return self.group_by_job(
            [successor for step in steps for successor in self.successors(step)]
        )

    def group_by_job(self, steps: list[JobType]) -> dict[JobType, list[JobType]]:
        """The jobs computing these steps, with the steps each job computes."""
        jobs: dict[JobType, list[JobType]] = {}
        for step in steps:
            job_steps = jobs.setdefault(self.job(step), [])
            if step not in job_steps:
                job_steps.append(step)
        return jobs


def _check_artefacts_produced(steps: dict[JobType, PipelineStep]) -> list[str]:
    produced = {a for s in steps.values() for a in s.produces}
    uploaded = {a for artefacts in UPLOADED_ARTEFACTS.values() for a in artefacts}
    return [
        f"Artefact '{a.value}' is produced by no step."
        for a in Artefact
        if a not in produced and a not in uploaded
    ]


def _check_jobs(steps: dict[JobType, PipelineStep]) -> list[str]:
    """A further step of a job shares the job's inputs and doctypes, as both are
    computed in the same run."""
    problems: list[str] = []
    for job_type, step in steps.items():
        if step.job is None:
            continue
        main = steps.get(step.job)
        if main is None or main.job is not None:
            problems.append(
                f"Step '{job_type.value}' is computed by '{step.job.value}', "
                "which is no pipeline step of its own."
            )
        elif main.requires != step.requires or main.doctypes != step.doctypes:
            problems.append(
                f"Step '{job_type.value}' must have the requires and doctypes of "
                f"its job '{step.job.value}'."
            )
    return problems


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
        nxt = min(ready, key=lambda jt: (len(steps[jt].doctypes), _job_type_order(jt)))
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
    """Collects the step declarations of `@pipeline_step` and builds the graph
    from them on first use."""

    def __init__(self) -> None:
        self._steps: dict[JobType, PipelineStep] = {}
        self._graph: PipelineGraph | None = None

    def register(self, job_type: JobType, step: PipelineStep) -> None:
        self._steps[job_type] = step
        self._graph = None

    def unregister(self, job_type: JobType) -> None:
        """Remove the steps of the job (the job's own step and its further steps)."""
        for step in [s for s, d in self._steps.items() if job_type in (s, d.job)]:
            del self._steps[step]
        self._graph = None

    def graph(self) -> PipelineGraph:
        if not self._steps:
            raise PipelineNotRegisteredError()
        if self._graph is None:
            self._graph = PipelineGraph(self._steps)
        return self._graph


pipeline_registry = PipelineRegistry()
