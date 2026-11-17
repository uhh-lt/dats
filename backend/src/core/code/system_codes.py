"""The system codes a project needs before some artefacts are produced, declared
as data: an artefact names the code trees it needs (`Artefact.codes`), and the
set up of the artefact system creates them (`crud_code.create_system_codes`)."""

from collections.abc import Iterable
from dataclasses import dataclass

# The root of every system code tree of a project.
ROOT = "SYSTEM_CODE"
ROOT_DESCRIPTION = "A system code"


@dataclass(frozen=True)
class SystemCode:
    """A system code with the codes below it."""

    name: str
    description: str
    enabled: bool = True
    children: tuple["SystemCode", ...] = ()


def parent_names(trees: Iterable[SystemCode]) -> dict[str, str | None]:
    """Every code name of these trees mapped to the name of its parent: `ROOT`
    maps to None, the top code of a tree to `ROOT`. Trees may overlap."""
    parents: dict[str, str | None] = {ROOT: None}

    def visit(code: SystemCode, parent: str) -> None:
        parents[code.name] = parent
        for child in code.children:
            visit(child, code.name)

    for tree in trees:
        visit(tree, ROOT)
    return parents


def declared_codes(trees: Iterable[SystemCode]) -> dict[str, SystemCode]:
    """Every code of these trees by name, the first declaration of a name (the
    startup check makes all declarations of a name agree); without `ROOT`."""
    codes: dict[str, SystemCode] = {}

    def visit(code: SystemCode) -> None:
        codes.setdefault(code.name, code)
        for child in code.children:
            visit(child)

    for tree in trees:
        visit(tree)
    return codes
