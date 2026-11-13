"""The artefacts and the pipeline steps, declared by the code that owns them.

An artefact is declared with `artefact(...)` in the file of its owner and
registers when the file is imported; every step and feature file imports the
artefacts it names. A step is declared with `@pipeline_step`. The registry
builds the pipeline graph from the steps and checks both at startup
(`check`)."""

from abc import ABC, abstractmethod
from collections.abc import Collection, Mapping
from dataclasses import dataclass
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.code.system_codes import SystemCode, parent_names
from systems.artefact_system.artefact_exceptions import (
    PipelineDeclarationError,
    PipelineNotRegisteredError,
)
from systems.artefact_system.artefact_system_enum import StorageKind
from systems.artefact_system.pipeline_graph import PipelineGraph, PipelineStep

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM


class ArtefactArchive(ABC):
    """Carries an artefact with its own store through the project archive. The
    export reads it and the import writes it only if the step producing it
    finished. `archived` is the document's archive row as a mapping; an archive
    validates the columns it reads itself."""

    @abstractmethod
    def read(self, sdoc: "SourceDocumentORM") -> dict[str, object]:
        """The archive columns of the document's artefact, read from its store."""

    def is_complete(self, archived: Mapping[str, object]) -> bool:
        """Whether the archive holds the whole artefact, so its step can be
        imported as it was. Artefacts that are recomputed on import are."""
        return True

    @abstractmethod
    def write(
        self, db: Session, sdoc: "SourceDocumentORM", archived: Mapping[str, object]
    ) -> None:
        """Write the archived artefact of the imported document to its store."""


@dataclass(frozen=True, eq=False)
class Artefact:
    """A named piece of data that preprocessing computes for a source document.
    Compared by identity: the registry keeps the names unique."""

    name: str
    kind: StorageKind
    # computed for every document, whatever features its project enables
    always: bool
    # the doctypes whose uploaded file is the artefact (no step produces it)
    uploaded_for: frozenset[DocType]
    # the system code trees a project needs before the artefact is produced
    codes: tuple[SystemCode, ...]
    # own store only, required there
    archive: ArtefactArchive | None


class ArtefactRegistry:
    """Collects the artefacts of `artefact(...)` and the step declarations of
    `@pipeline_step`, and builds the graph from them on first use."""

    def __init__(self) -> None:
        self._artefacts: dict[str, Artefact] = {}
        self._steps: dict[str, PipelineStep] = {}
        self._graph: PipelineGraph | None = None

    # --- artefacts

    def register_artefact(self, artefact: Artefact) -> None:
        if artefact.name in self._artefacts:
            raise PipelineDeclarationError(
                [f"Artefact '{artefact.name}' is declared twice."]
            )
        self._artefacts[artefact.name] = artefact
        self._graph = None

    def unregister_artefact(self, name: str) -> None:
        """Remove the artefact of this name (tests)."""
        self._artefacts.pop(name, None)
        self._graph = None

    def artefact(self, name: str) -> Artefact | None:
        """The artefact of this name, None if none of this name is registered
        (e.g. a stored name of a removed artefact)."""
        return self._artefacts.get(name)

    def artefacts(self) -> list[Artefact]:
        """All artefacts, sorted by name."""
        return sorted(self._artefacts.values(), key=lambda a: a.name)

    def always(self) -> frozenset[Artefact]:
        """The artefacts every document gets, whatever features its project
        enables."""
        return frozenset(a for a in self._artefacts.values() if a.always)

    def archives(self) -> list[tuple[Artefact, ArtefactArchive]]:
        """The artefacts with an own store, with their archive, sorted by name."""
        return [(a, a.archive) for a in self.artefacts() if a.archive is not None]

    def system_codes(self) -> list[SystemCode]:
        """The code trees the registered artefacts declare, each declared object
        once, in the order of `artefacts()`."""
        codes: list[SystemCode] = []
        for artefact in self.artefacts():
            codes += [c for c in artefact.codes if not any(c is k for k in codes)]
        return codes

    # --- steps

    def register_step(self, job_type: str, step: PipelineStep) -> None:
        self._steps[job_type] = step
        self._graph = None

    def unregister_step(self, job_type: str) -> None:
        """Remove the steps of the job (the job's own step and its further steps)."""
        for step in [s for s, d in self._steps.items() if job_type in (s, d.job)]:
            del self._steps[step]
        self._graph = None

    def graph(self) -> PipelineGraph:
        if not self._steps:
            raise PipelineNotRegisteredError()
        if self._graph is None:
            self._graph = PipelineGraph(self._steps, self._artefacts.values())
        return self._graph

    def check(self) -> None:
        """Check the declarations at startup: build the graph (its checks of the
        steps and the artefacts) and check the declared system codes. Raises a
        `PipelineDeclarationError` listing all problems."""
        self.graph()
        problems = _check_system_codes(self.artefacts())
        if problems:
            raise PipelineDeclarationError(problems)


def _check_system_codes(artefacts: list[Artefact]) -> list[str]:
    """A code name is unique in a project, so every declaration of a name must
    give it the same parent, description and `enabled` flag."""
    problems: list[str] = []
    seen: dict[str, tuple[str | None, str, bool]] = {}
    for artefact in artefacts:
        for name, parent in parent_names(artefact.codes).items():
            code = _find(artefact.codes, name)
            if code is None:
                continue
            declared = (parent, code.description, code.enabled)
            if seen.setdefault(name, declared) != declared:
                problems.append(
                    f"System code '{name}' is declared differently by artefact "
                    f"'{artefact.name}' and another artefact (parent, description "
                    "or enabled flag)."
                )
    return problems


def _find(trees: Collection[SystemCode], name: str) -> SystemCode | None:
    for tree in trees:
        if tree.name == name:
            return tree
        found = _find(tree.children, name)
        if found is not None:
            return found
    return None


artefact_registry = ArtefactRegistry()


def artefact(
    name: str,
    *,
    kind: StorageKind,
    always: bool = False,
    uploaded_for: Collection[DocType] = (),
    codes: Collection[SystemCode] = (),
    archive: ArtefactArchive | None = None,
) -> Artefact:
    """Declare and register an artefact. Raises on a duplicate name. Returns the
    artefact, which steps and features import."""
    declared = Artefact(
        name=name,
        kind=kind,
        always=always,
        uploaded_for=frozenset(uploaded_for),
        codes=tuple(codes),
        archive=archive,
    )
    artefact_registry.register_artefact(declared)
    return declared
