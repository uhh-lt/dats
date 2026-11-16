"""The document preprocessing pipeline, derived from the step declarations.

Every pipeline step declares in `@pipeline_step` the artefacts it `requires` and
`produces` and the doctypes it applies to. From these declarations, this module
derives per doctype the steps, their order and which step feeds which, and
answers every question about that relation: the steps some artefacts need,
whether they apply to a doctype, the input steps of a step and the steps after
a step.

Each step is computed by a job of its own, named like the step.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from typing import TYPE_CHECKING

from common.doc_type_enum import DocType
from systems.artefact_system.artefact_exceptions import PipelineDeclarationError
from systems.artefact_system.artefact_system_enum import StorageKind

if TYPE_CHECKING:
    from systems.artefact_system.artefact_registry import Artefact

# The most steps `crud_sdoc_step_status.count_by_project` counts: one bit each in
# a BIGINT, without the sign bit. The graph rejects more pipeline steps.
MAX_COUNTED_STEPS = 63


@dataclass(frozen=True)
class PipelineStep:
    requires: frozenset["Artefact"]
    produces: frozenset["Artefact"]
    doctypes: frozenset[DocType]


class PipelineGraph:
    """The pipeline derived from the step declarations and the registered
    artefacts. Raises a `PipelineDeclarationError` listing all problems if the
    declarations are invalid."""

    def __init__(
        self, steps: dict[str, PipelineStep], artefacts: Iterable["Artefact"]
    ) -> None:
        self._declarations = dict(steps)
        self._artefacts = frozenset(artefacts)
        self._steps_by_doctype: dict[DocType, list[str]] = {}
        self._roots_by_doctype: dict[DocType, list[str]] = {}
        # the input steps of each step per doctype: the producers of its
        # required artefacts
        self._dependencies: dict[DocType, dict[str, set[str]]] = {}
        successors_by_doctype: dict[DocType, dict[str, list[str]]] = {}

        problems = _check_artefacts(steps, self._artefacts) + _check_always(steps)
        if len(steps) > MAX_COUNTED_STEPS:
            problems.append(
                f"There are {len(steps)} pipeline steps, but the feature states "
                f"count at most {MAX_COUNTED_STEPS} (one bit each in a BIGINT, see "
                f"crud_sdoc_step_status.count_by_project)."
            )
        for doctype in DocType:
            doctype_steps = {jt: s for jt, s in steps.items() if doctype in s.doctypes}
            deps, dep_problems = _dependencies(
                doctype, doctype_steps, self._uploaded(doctype)
            )
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
                        f"Step '{job_type}' of doctype '{doctype.value}' would be "
                        f"started by several steps: {sorted(predecessors)}."
                    )
            self._steps_by_doctype[doctype] = order
            self._dependencies[doctype] = deps
            self._roots_by_doctype[doctype] = [jt for jt in order if not deps[jt]]
            successors_by_doctype[doctype] = {
                jt: [s for s in order if jt in triggers[s]] for jt in order
            }

        self._successors: dict[str, list[str]] = {}
        for job_type, step in steps.items():
            per_doctype = {
                doctype: successors_by_doctype[doctype][job_type]
                for doctype in step.doctypes
                if doctype in successors_by_doctype
            }
            if len({tuple(s) for s in per_doctype.values()}) > 1:
                problems.append(
                    f"Step '{job_type}' starts different steps per doctype."
                )
            self._successors[job_type] = next(iter(per_doctype.values()), [])

        if problems:
            raise PipelineDeclarationError(problems)

    def steps(self, doctype: DocType) -> list[str]:
        """The steps run for a document of this doctype, in a valid order."""
        return self._steps_by_doctype[doctype]

    def all_steps(self) -> frozenset[str]:
        """The steps of every doctype."""
        return frozenset(self._declarations)

    def declaration(self, step: str) -> PipelineStep:
        """The declaration of this step: what it requires, produces and its doctypes."""
        return self._declarations[step]

    def _uploaded(self, doctype: DocType) -> frozenset["Artefact"]:
        """The artefacts the uploaded file of this doctype provides."""
        return frozenset(a for a in self._artefacts if doctype in a.uploaded_for)

    def producer(self, doctype: DocType, artefact: "Artefact") -> str | None:
        """The step of this doctype that produces the artefact, None if no step
        of the doctype does (e.g. image embeddings of a text document)."""
        for step in self.steps(doctype):
            if artefact in self._declarations[step].produces:
                return step
        return None

    def steps_for(
        self, doctype: DocType, artefacts: frozenset["Artefact"]
    ) -> list[str]:
        """The steps of the doctype these artefacts need, in pipeline order:
        their producers and the input steps of these, transitively. An
        artefact without a producer for the doctype adds no step."""
        deps = self._dependencies[doctype]
        needed: set[str] = set()
        todo = [
            step
            for step in (self.producer(doctype, a) for a in artefacts)
            if step is not None
        ]
        while todo:
            step = todo.pop()
            if step in needed:
                continue
            needed.add(step)
            todo.extend(deps[step])
        return [s for s in self.steps(doctype) if s in needed]

    def core_steps(self, doctype: DocType) -> list[str]:
        """The core steps of the doctype, in pipeline order: the steps of the
        always-computed artefacts, which every document gets whatever features
        its project enables."""
        return self.steps_for(
            doctype, frozenset(a for a in self._artefacts if a.always)
        )

    def applies(self, doctype: DocType, artefacts: frozenset["Artefact"]) -> bool:
        """Whether these artefacts apply to a document of this doctype: one of
        them has a producer for the doctype or is uploaded with it (e.g. image
        embeddings do not apply to a text document, the sentence and image
        embeddings together do). The steps of such a document are those of the
        artefacts that apply (`steps_for`)."""
        uploaded = self._uploaded(doctype)
        return any(
            a in uploaded or self.producer(doctype, a) is not None for a in artefacts
        )

    def inputs(self, doctype: DocType, step: str) -> list[str]:
        """The input steps of this step for the doctype: the producers of the
        artefacts it requires, in pipeline order. Inside a plan, every input step
        of a planned step is planned too."""
        deps = self._dependencies[doctype][step]
        return [s for s in self.steps(doctype) if s in deps]

    def descendants(self, steps: list[str]) -> list[str]:
        """The steps that need the output of these steps, directly or
        transitively (the same for every doctype)."""
        found: list[str] = []
        todo = [s for step in steps for s in self.successors(step)]
        while todo:
            step = todo.pop()
            if step in found or step in steps:
                continue
            found.append(step)
            todo.extend(self.successors(step))
        return found

    def roots(self, doctype: DocType) -> list[str]:
        """The steps that start when a document of this doctype is created."""
        return self._roots_by_doctype[doctype]

    def successors(self, job_type: str) -> list[str]:
        """The steps started when this step finished (empty for non-pipeline jobs)."""
        return self._successors.get(job_type, [])


def _check_artefacts(
    steps: dict[str, PipelineStep], artefacts: frozenset["Artefact"]
) -> list[str]:
    """Every registered artefact is produced by a step or uploaded, and has an
    archive exactly if it has an own store."""
    produced = {a for s in steps.values() for a in s.produces}
    problems: list[str] = []
    for a in sorted(artefacts, key=lambda a: a.name):
        if a not in produced and not a.uploaded_for:
            problems.append(f"Artefact '{a.name}' is produced by no step.")
        if (a.kind == StorageKind.OWN_STORE) != (a.archive is not None):
            problems.append(
                f"Artefact '{a.name}' must declare an archive exactly if it has "
                "its own store."
            )
    return problems


def _check_always(steps: dict[str, PipelineStep]) -> list[str]:
    """A step produces either always-computed or on-demand artefacts, and the
    step of an always-computed artefact requires only always-computed ones: so
    the always-computed steps never wait for an on-demand step."""
    problems: list[str] = []
    for job_type, step in steps.items():
        always = {a.always for a in step.produces}
        if len(always) > 1:
            problems.append(
                f"Step '{job_type}' produces always-computed and on-demand artefacts."
            )
        if True in always and not all(a.always for a in step.requires):
            problems.append(
                f"Step '{job_type}' produces an always-computed artefact but "
                "requires an on-demand one."
            )
    return problems


def _dependencies(
    doctype: DocType,
    steps: dict[str, PipelineStep],
    uploaded: frozenset["Artefact"],
) -> tuple[dict[str, set[str]], list[str]]:
    """The steps each step depends on, i.e. the producers of its required artefacts."""
    problems: list[str] = []
    producers: dict["Artefact", str] = {}
    for job_type, step in steps.items():
        for artefact in step.produces:
            if artefact in producers:
                problems.append(
                    f"Artefact '{artefact.name}' of doctype '{doctype.value}' is produced "
                    f"by several steps: '{producers[artefact]}', '{job_type}'."
                )
            producers[artefact] = job_type

    deps: dict[str, set[str]] = {jt: set() for jt in steps}
    for job_type, step in steps.items():
        for artefact in step.requires:
            if artefact in uploaded:
                continue
            if artefact not in producers:
                problems.append(
                    f"Step '{job_type}' requires artefact '{artefact.name}', which "
                    f"no step produces for doctype '{doctype.value}'."
                )
                continue
            deps[job_type].add(producers[artefact])
    return deps, problems


def _order(
    steps: dict[str, PipelineStep], deps: dict[str, set[str]]
) -> list[str] | None:
    """Topological order (None on a cycle). Among the steps that are ready, the
    most doctype-specific step comes first, then the step name."""
    order: list[str] = []
    remaining = dict(deps)
    while remaining:
        ready = [jt for jt, d in remaining.items() if d.issubset(order)]
        if not ready:
            return None
        nxt = min(ready, key=lambda jt: (len(steps[jt].doctypes), jt))
        order.append(nxt)
        del remaining[nxt]
    return order


def _transitive_reduction(
    order: list[str], deps: dict[str, set[str]]
) -> dict[str, set[str]]:
    """The direct predecessors of each step: its dependencies that are not
    already a dependency of another of its dependencies."""
    ancestors: dict[str, set[str]] = {}
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
