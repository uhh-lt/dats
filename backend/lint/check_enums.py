#!/usr/bin/env python3
"""
check_enums.py

Enforces that enum classes are only defined in enum modules, so that the enums
of a module are found in one place and ORMs, CRUDs and DTOs can share them
without importing each other:

    core|modules/<module>/<module>_enum.py   one enum file per module
    repos/<component>_enum.py                 repo enums, next to the repo
    systems/<system>/<system>_enum.py         system enums, next to the system
    common/<name>_enum.py                     shared enums (DocType, JobType, ...)

Exempt, because they are not plain value sets:

    common/dats_event.py          DATSEvent, the websocket event registry
    systems/search_system/**      the search operators, sorting and grouping enums
    *_columns.py                  search columns (AbstractColumns subclasses)

Rules (the rule id is printed with every violation):

    enum-location  An enum class is defined outside a *_enum.py file.
    value-type     Enums are `(str, Enum)` or `StrEnum`, so they serialize as their
                   value. Int-valued enums (`IntEnum`, `(int, Enum)`) are allowed because
                   their values are ints; a plain `Enum` without a value type is not.
                   Exempt: the CRUD registries `Crud` and `MemoCrud` (common/crud_enum.py).

A class is an enum class if one of its bases is Enum, StrEnum, IntEnum, Flag,
IntFlag (also as `enum.Enum`), or another enum class defined in backend/src.

Usage:
    check_enums.py                 check every .py file below backend/src
    check_enums.py FILE [FILE...]  check the given files (passing
                                   check_enums.py itself checks everything)
"""

import ast
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SRC_ROOT = REPO_ROOT / "backend" / "src"

ENUM_BASES = {"Enum", "StrEnum", "IntEnum", "Flag", "IntFlag"}
VALUE_TYPE_BASES = {"StrEnum", "str", "IntEnum", "IntFlag", "int"}
# registries whose member values are objects (the CRUD singletons), not wire values
VALUE_TYPE_EXEMPT = {"Crud", "MemoCrud"}
EXEMPT_FILES = ("common/dats_event.py",)
EXEMPT_DIRS = ("systems/search_system/",)
EXEMPT_SUFFIXES = ("_columns.py",)


@dataclass(frozen=True)
class Violation:
    path: str
    line: int
    rule: str
    message: str
    cls: str | None = None

    def __str__(self) -> str:
        where = f" {self.cls}:" if self.cls else ""
        return f"{self.path}:{self.line}: [{self.rule}]{where} {self.message}"


def base_name(node: ast.expr) -> str | None:
    if isinstance(node, ast.Subscript):
        node = node.value
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def class_defs(tree: ast.Module) -> list[ast.ClassDef]:
    return [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]


def is_enum(cls: ast.ClassDef, known: set[str]) -> bool:
    return any(base_name(b) in ENUM_BASES | known for b in cls.bases)


def enum_names(trees: list[ast.Module]) -> set[str]:
    """Names of all enum classes, resolved transitively over the given trees."""
    classes = [c for t in trees for c in class_defs(t)]
    known: set[str] = set()
    changed = True
    while changed:
        changed = False
        for c in classes:
            if c.name not in known and is_enum(c, known):
                known.add(c.name)
                changed = True
    return known


def is_allowed(path: Path) -> bool:
    p = path.as_posix()
    return (
        path.name.endswith("_enum.py")
        or path.name.endswith(EXEMPT_SUFFIXES)
        or any(p.endswith(f) for f in EXEMPT_FILES)
        or any(d in p for d in EXEMPT_DIRS)
    )


def check_source(path: Path, source: str, known: set[str]) -> list[Violation]:
    p = str(path)
    try:
        tree = ast.parse(source, filename=p)
    except SyntaxError as e:
        return [Violation(p, e.lineno or 0, "parse", f"Could not parse file: {e}")]
    if not path.name.endswith("_enum.py") and is_allowed(path):
        return []
    violations = []
    for c in class_defs(tree):
        if not is_enum(c, known):
            continue
        if not path.name.endswith("_enum.py"):
            violations.append(
                Violation(
                    p,
                    c.lineno,
                    "enum-location",
                    "Enum class outside a *_enum.py file (move it to the "
                    "<module>_enum.py of its module, next to the module's "
                    "*_exceptions.py; create the file if the module has none yet).",
                    c.name,
                )
            )
        bases = {base_name(b) for b in c.bases}
        # subclasses of DATS enums inherit the value type of their base
        if (
            bases & ENUM_BASES
            and not bases & VALUE_TYPE_BASES
            and c.name not in VALUE_TYPE_EXEMPT
        ):
            violations.append(
                Violation(
                    p,
                    c.lineno,
                    "value-type",
                    "Enum without value type (use '(str, Enum)' or 'StrEnum').",
                    c.name,
                )
            )
    return violations


def display_path(path: Path) -> Path:
    try:
        return path.resolve().relative_to(REPO_ROOT)
    except ValueError:
        return path


def parse_all(root: Path) -> list[ast.Module]:
    trees = []
    for f in sorted(root.rglob("*.py")):
        try:
            trees.append(ast.parse(f.read_text(encoding="utf-8")))
        except SyntaxError:
            pass
    return trees


def main(argv: list[str]) -> int:
    if any(a in ("-h", "--help") for a in argv):
        print(__doc__)
        return 0

    paths = [Path(a) for a in argv]
    if not paths or any(p.name == Path(__file__).name for p in paths):
        files = sorted(SRC_ROOT.rglob("*.py"))
    else:
        files = [p for p in paths if p.suffix == ".py"]

    # enum classes are resolved over the whole source tree, so that a class
    # deriving from an enum of another module is recognized too
    known = enum_names(parse_all(SRC_ROOT))
    violations = [
        v
        for f in files
        for v in check_source(display_path(f), f.read_text(encoding="utf-8"), known)
    ]
    for v in violations:
        print(v)
    if violations:
        print(f"\n{len(violations)} enum violation(s) in {len(files)} file(s).")
        print("Run 'check_enums.py --help' for the rules.")
        return 1
    print(f"All enum checks passed ({len(files)} file(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
