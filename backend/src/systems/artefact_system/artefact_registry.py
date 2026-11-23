"""The artefacts and the pipeline steps, declared by the code that owns them.

An artefact is declared with `artefact(...)` in the file of its owner and
registers when the file is imported; every step and feature file imports the
artefacts it names. An artefact names its store, the only way to its data. A
step is declared with `@pipeline_step`. The registry builds the pipeline graph
from the steps and checks both at startup (`check`)."""

from abc import ABC, abstractmethod
from collections.abc import Collection, Mapping
from dataclasses import dataclass
from typing import TYPE_CHECKING, Generic, TypeVar

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.code.system_codes import ROOT, SystemCode
from systems.artefact_system.artefact_exceptions import (
    PipelineDeclarationError,
    PipelineNotRegisteredError,
)
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


class ArtefactStore(ABC):
    """A store of artefacts in the core entities (document data columns,
    metadata keys, the system user's annotations). Each artefact owns its share:
    no two artefacts declare the same column, key or annotation set."""

    @abstractmethod
    def owned(self) -> frozenset[str]:
        """What the store owns, one text per column, key, code or span group
        ("document data column 'content'"); the startup check compares them."""

    @property
    def codes(self) -> tuple[SystemCode, ...]:
        """The system code trees of the annotations the store holds."""
        return ()


# an `ArtefactStore` or the CRUD of a store of its own (a table, a Weaviate
# collection, an Elasticsearch index, files)
StoreT = TypeVar("StoreT")


@dataclass(frozen=True, eq=False)
class Artefact(Generic[StoreT]):
    """A named piece of data that preprocessing computes for a source document,
    read and written through its store. Compared by identity: the registry
    keeps the names unique."""

    name: str
    # short and user-facing, in the style of the feature titles
    title: str
    # computed for every document, whatever features its project enables
    always: bool
    # the doctypes whose uploaded file is the artefact (no step produces it)
    uploaded_for: frozenset[DocType]
    # the only way to the artefact's data
    store: StoreT
    # the archive of its own store; None if the generic export of document
    # data, metadata and annotations carries it
    archive: ArtefactArchive | None

    @property
    def codes(self) -> tuple[SystemCode, ...]:
        """The system code trees a project needs before the artefact is
        produced: those of the annotations its store holds."""
        if isinstance(self.store, ArtefactStore):
            return self.store.codes
        return ()


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
        if job_type in self._steps:
            raise PipelineDeclarationError([f"Step '{job_type}' is declared twice."])
        self._steps[job_type] = step
        self._graph = None

    def unregister_step(self, job_type: str) -> None:
        """Remove the step of the job (tests)."""
        self._steps.pop(job_type, None)
        self._graph = None

    def graph(self) -> PipelineGraph:
        if not self._steps:
            raise PipelineNotRegisteredError()
        if self._graph is None:
            self._graph = PipelineGraph(self._steps, self._artefacts.values())
        return self._graph

    def check(self) -> None:
        """Check the declarations at startup: build the graph (its checks of the
        steps and the artefacts) and check the declared system codes. Raises one
        `PipelineDeclarationError` listing all problems."""
        problems: list[str] = []
        try:
            self.graph()
        except PipelineDeclarationError as e:
            problems += e.problems
        problems += _check_system_codes(self.artefacts())
        problems += _check_owned(self.artefacts())
        if problems:
            raise PipelineDeclarationError(problems)


def _check_system_codes(artefacts: list[Artefact]) -> list[str]:
    """A code name is unique in a project, so every node of every declared tree
    that has a name must give it the same parent, description and `enabled`
    flag, within one artefact and across artefacts."""
    problems: list[str] = []
    seen: dict[str, tuple[str, str, bool]] = {}

    def visit(artefact: Artefact, code: SystemCode, parent: str) -> None:
        declared = (parent, code.description, code.enabled)
        if seen.setdefault(code.name, declared) != declared:
            problems.append(
                f"System code '{code.name}' is declared differently by two trees "
                f"(at artefact '{artefact.name}': parent, description or enabled "
                "flag)."
            )
        for child in code.children:
            visit(artefact, child, code.name)

    for artefact in artefacts:
        for tree in artefact.codes:
            visit(artefact, tree, ROOT)
    return problems


def _check_owned(artefacts: list[Artefact]) -> list[str]:
    """Every document data column, metadata key and annotation set belongs to
    one artefact: two artefacts whose stores own the same fail."""
    problems: list[str] = []
    owners: dict[str, str] = {}
    for artefact in artefacts:
        if not isinstance(artefact.store, ArtefactStore):
            continue
        for owned in sorted(artefact.store.owned()):
            owner = owners.setdefault(owned, artefact.name)
            if owner != artefact.name:
                problems.append(
                    f"The {owned} is declared by the artefacts '{owner}' and "
                    f"'{artefact.name}'."
                )
    return problems


artefact_registry = ArtefactRegistry()


def artefact(
    name: str,
    *,
    title: str,
    always: bool = False,
    store: StoreT,
    uploaded_for: Collection[DocType] = (),
    archive: ArtefactArchive | None = None,
) -> Artefact[StoreT]:
    """Declare and register an artefact with its store. Raises on a duplicate
    name. Returns the artefact, which steps and features import."""
    declared = Artefact(
        name=name,
        title=title,
        always=always,
        uploaded_for=frozenset(uploaded_for),
        store=store,
        archive=archive,
    )
    artefact_registry.register_artefact(declared)
    return declared
