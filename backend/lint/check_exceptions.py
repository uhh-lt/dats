#!/usr/bin/env python3
"""
check_exceptions.py

Enforces that exception classes are only defined in exception modules, so that
every domain error (and its HTTP mapping via @exception_handler) of a module is
found in one place:

    modules/<module>/<module>_exceptions.py   module and core exceptions
    repos/**/<component>_exceptions.py         repo exceptions, next to the repo
    systems/**/<component>_exceptions.py       system exceptions, next to the system
    common/common_exceptions.py                shared exceptions (NotFoundError)

Rules (the rule id is printed with every violation):

    exception-location  An exception class is defined outside a *_exceptions.py file.

A class is an exception class if one of its bases is a builtin exception, a name
ending in 'Error' or 'Exception', or another exception class defined in backend/src.

Usage:
    check_exceptions.py                 check every .py file below backend/src
    check_exceptions.py FILE [FILE...]  check the given files (passing
                                        check_exceptions.py itself checks everything)
"""

import ast
import builtins
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SRC_ROOT = REPO_ROOT / "backend" / "src"

BUILTIN_EXCEPTIONS = {
    name
    for name, obj in vars(builtins).items()
    if isinstance(obj, type) and issubclass(obj, BaseException)
}


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


def is_exception(cls: ast.ClassDef, known: set[str]) -> bool:
    for b in cls.bases:
        n = base_name(b)
        if n is not None and (
            n in BUILTIN_EXCEPTIONS or n in known or n.endswith(("Error", "Exception"))
        ):
            return True
    return False


def exception_names(trees: list[ast.Module]) -> set[str]:
    """Names of all exception classes, resolved transitively over the given trees."""
    classes = [c for t in trees for c in class_defs(t)]
    known: set[str] = set()
    changed = True
    while changed:
        changed = False
        for c in classes:
            if c.name not in known and is_exception(c, known):
                known.add(c.name)
                changed = True
    return known


def is_allowed(path: Path) -> bool:
    return path.name.endswith("_exceptions.py")


def check_source(path: Path, source: str, known: set[str]) -> list[Violation]:
    p = str(path)
    try:
        tree = ast.parse(source, filename=p)
    except SyntaxError as e:
        return [Violation(p, e.lineno or 0, "parse", f"Could not parse file: {e}")]
    if is_allowed(path):
        return []
    return [
        Violation(
            p,
            c.lineno,
            "exception-location",
            "Exception class outside a *_exceptions.py file "
            "(move it to <module>_exceptions.py).",
            c.name,
        )
        for c in class_defs(tree)
        if is_exception(c, known)
    ]


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

    # exception classes are resolved over the whole source tree, so that a class
    # deriving from an exception of another module is recognized too
    known = exception_names(parse_all(SRC_ROOT))
    violations = [
        v
        for f in files
        for v in check_source(display_path(f), f.read_text(encoding="utf-8"), known)
    ]
    for v in violations:
        print(v)
    if violations:
        print(f"\n{len(violations)} exception violation(s) in {len(files)} file(s).")
        print("Run 'check_exceptions.py --help' for the rules.")
        return 1
    print(f"All exception checks passed ({len(files)} file(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
