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


# The path NAMED_ENTITY > PERSON has two users: the named-entity spans and the
# object boxes (DETR's "person"). Declared once, here; both extend it.
NAMED_ENTITY_PERSON = SystemCode(
    "NAMED_ENTITY",
    "A named entity",
    children=(SystemCode("PERSON", "People, including fictional"),),
)

# Until coreference resolution and quotation detection declare their artefacts
# (PR F), every project gets these codes at its creation.
MENTION_CODES = SystemCode("MENTION", "Co-reference mention")

QUOTATION_CODES = SystemCode(
    "QUOTATIONS",
    "Quotation parts",
    children=(
        SystemCode(
            "QUOTE",
            "the quotation uttered by the Speaker",
            children=(
                SystemCode(
                    "DIRECT", "actual words of an utterance, usually in quotation marks"
                ),
                SystemCode(
                    "INDIRECT",
                    "content-wise equivalent utterance using different words, usually part of a sentence together with a Frame",
                ),
                SystemCode(
                    "REPORTED",
                    "report of a speech action, possibly far from the original quote, usually a full sentence, no Frame",
                ),
                SystemCode(
                    "FREE_INDIRECT",
                    'mix of article author & actual speaker, typically construct with "sollen" (shall) or "müssen" (must), full sentence',
                ),
                SystemCode(
                    "INDIRECT_FREE_INDIRECT",
                    "content-wise equivalent utterance written in conjunctive mood, full sentence",
                ),
            ),
        ),
        SystemCode("SPEAKER", "entity in the text that utters the quotation"),
        SystemCode(
            "CUE", "words that are part of a Frame and signal a Quote construction"
        ),
        SystemCode("ADDRESSEE", "entity in the text that the quotation is directed at"),
        SystemCode(
            "FRAME", "part of a sentence including Cue & Speaker, but not the quotation"
        ),
    ),
)
