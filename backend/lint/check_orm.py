#!/usr/bin/env python3
"""
check_orm.py

Enforces the unified conventions for the SQLAlchemy models in backend/src/**/*_orm.py
(see .github/instructions/backend-orm.instructions.md).

Rules (the rule id is printed with every violation):

    typed-mapping      Every mapped_column(...) / relationship(...) attribute is annotated
                       with Mapped[...].
    no-tablename       No __tablename__; ORMBase derives the table name from the class name.
    no-column          No legacy Column(...); use mapped_column(...).
    nullable           Nullability comes from the annotation: no nullable=True (use
                       Mapped[T | None]) and no nullable=False on a Mapped[T | None] column.
    fk-ondelete        Every ForeignKey(...) passes ondelete="CASCADE" ("SET NULL" is
                       allowed on a Mapped[T | None] column).
    fk-index           Every column with a ForeignKey(...) passes index=True.
    tz-datetime        DateTime columns are DateTime(timezone=True).
    no-native-enum     No native Enum(...) / ENUM(...) column type; store enums as String
                       or Integer annotated with the enum type.
    no-backref         No backref; declare both sides with back_populates.
    constraint-name    UniqueConstraint names start with 'UC_', CheckConstraint names
                       with 'CC_'.
    type-checking-import  Other ORM modules are imported only under `if TYPE_CHECKING:`.
    runtime-import     No runtime imports of CRUDs, services, endpoints or repos (other
                       than repos.db.orm_base).

Usage:
    check_orm.py                 check every *_orm.py file below backend/src
    check_orm.py FILE [FILE...]  check the given files (non-ORM files are ignored;
                                 passing check_orm.py itself checks everything)
"""

import ast
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SRC_ROOT = REPO_ROOT / "backend" / "src"

# Module suffixes that an ORM must never import at runtime.
FORBIDDEN_MODULE_SUFFIXES = ("_crud", "_service", "_endpoint")
ALLOWED_REPOS_MODULES = {"repos.db.orm_base"}

CONSTRAINT_PREFIXES = {"UniqueConstraint": "UC_", "CheckConstraint": "CC_"}


@dataclass(frozen=True)
class Violation:
    path: str
    line: int
    rule: str
    message: str
    cls: str | None = None
    attr: str | None = None

    def __str__(self) -> str:
        where = ".".join(x for x in (self.cls, self.attr) if x)
        where = f" {where}:" if where else ""
        return f"{self.path}:{self.line}: [{self.rule}]{where} {self.message}"


def call_name(node: ast.AST) -> str | None:
    if not isinstance(node, ast.Call):
        return None
    if isinstance(node.func, ast.Name):
        return node.func.id
    if isinstance(node.func, ast.Attribute):
        return node.func.attr
    return None


def keyword(call: ast.Call, name: str) -> ast.expr | None:
    return next((k.value for k in call.keywords if k.arg == name), None)


def is_const(node: ast.expr | None, value: object) -> bool:
    return isinstance(node, ast.Constant) and node.value == value


def is_mapped(annotation: ast.expr | None) -> bool:
    if not isinstance(annotation, ast.Subscript):
        return False
    value = annotation.value
    name = value.id if isinstance(value, ast.Name) else getattr(value, "attr", None)
    return name == "Mapped"


def is_optional(annotation: ast.expr | None) -> bool:
    """True for Mapped[T | None] / Mapped[Optional[T]] / Mapped["T | None"]."""
    if not isinstance(annotation, ast.Subscript):
        return False
    inner = annotation.slice
    if isinstance(inner, ast.Constant) and isinstance(inner.value, str):
        try:
            inner = ast.parse(inner.value, mode="eval").body
        except SyntaxError:
            return False
    for sub in ast.walk(inner):
        if isinstance(sub, ast.Constant) and sub.value is None:
            return True
        if isinstance(sub, ast.Name) and sub.id in ("None", "Optional"):
            return True
    return False


def is_type_checking(node: ast.If) -> bool:
    test = node.test
    return (isinstance(test, ast.Name) and test.id == "TYPE_CHECKING") or (
        isinstance(test, ast.Attribute) and test.attr == "TYPE_CHECKING"
    )


def check_imports(p: str, tree: ast.Module) -> list[Violation]:
    violations: list[Violation] = []
    runtime_imports: list[ast.Import | ast.ImportFrom] = []

    def collect(body: list[ast.stmt]) -> None:
        for node in body:
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                runtime_imports.append(node)
            elif isinstance(node, ast.If) and not is_type_checking(node):
                collect(node.body)
                collect(node.orelse)
            elif isinstance(node, ast.Try):
                collect(node.body)

    collect(tree.body)
    for node in runtime_imports:
        if isinstance(node, ast.ImportFrom):
            modules = [node.module or ""]
        else:
            modules = [a.name for a in node.names]
        for module in modules:
            last = module.rsplit(".", 1)[-1]
            if last.endswith("_orm") and module not in ALLOWED_REPOS_MODULES:
                violations.append(
                    Violation(
                        p,
                        node.lineno,
                        "type-checking-import",
                        f"Imports '{module}' at runtime; import related ORMs under 'if TYPE_CHECKING:'.",
                    )
                )
            elif last.endswith(FORBIDDEN_MODULE_SUFFIXES) or (
                module.split(".")[0] == "repos" and module not in ALLOWED_REPOS_MODULES
            ):
                violations.append(
                    Violation(
                        p,
                        node.lineno,
                        "runtime-import",
                        f"ORMs must not import '{module}' (only sqlalchemy, ORMBase, common/ and DTO value types).",
                    )
                )
    return violations


def check_column(
    p: str,
    cls: str,
    attr: str,
    annotation: ast.expr | None,
    call: ast.Call,
) -> list[Violation]:
    violations: list[Violation] = []

    def add(rule: str, message: str, line: int | None = None) -> None:
        violations.append(Violation(p, line or call.lineno, rule, message, cls, attr))

    optional = is_optional(annotation)

    # nullable
    nullable = keyword(call, "nullable")
    if is_const(nullable, True) and optional:
        add(
            "nullable", "Redundant nullable=True; Mapped[T | None] is already nullable."
        )
    elif is_const(nullable, True):
        add("nullable", "nullable=True; annotate the column as Mapped[T | None].")
    elif is_const(nullable, False) and optional:
        add("nullable", "nullable=False contradicts the Mapped[T | None] annotation.")

    has_fk = False
    for sub in ast.walk(call):
        name = call_name(sub)
        if name == "ForeignKey":
            assert isinstance(sub, ast.Call)
            has_fk = True
            ondelete = keyword(sub, "ondelete")
            if is_const(ondelete, "SET NULL") and optional:
                continue
            if not is_const(ondelete, "CASCADE"):
                add(
                    "fk-ondelete",
                    'ForeignKey must pass ondelete="CASCADE" ("SET NULL" only on optional columns).',
                    sub.lineno,
                )
        elif name == "DateTime":
            assert isinstance(sub, ast.Call)
            if not is_const(keyword(sub, "timezone"), True):
                add("tz-datetime", "Use DateTime(timezone=True).", sub.lineno)
        elif name in ("Enum", "ENUM"):
            add(
                "no-native-enum",
                "Native Enum column type; use String (or Integer) annotated with the enum.",
                sub.lineno,
            )

    # a bare `DateTime` type (not called) is naive as well
    for arg in call.args:
        if isinstance(arg, (ast.Name, ast.Attribute)) and (
            getattr(arg, "id", None) == "DateTime"
            or getattr(arg, "attr", None) == "DateTime"
        ):
            add("tz-datetime", "Use DateTime(timezone=True).", arg.lineno)

    if has_fk and not is_const(keyword(call, "index"), True):
        add("fk-index", "Foreign key column must pass index=True.")
    return violations


def check_class(p: str, node: ast.ClassDef) -> list[Violation]:
    violations: list[Violation] = []
    c = node.name
    for stmt in node.body:
        targets: list[ast.expr]
        annotation: ast.expr | None = None
        if isinstance(stmt, ast.AnnAssign):
            targets = [stmt.target]
            annotation = stmt.annotation
            value = stmt.value
        elif isinstance(stmt, ast.Assign):
            targets = stmt.targets
            value = stmt.value
        else:
            continue
        names = [t.id for t in targets if isinstance(t, ast.Name)]
        attr = names[0] if names else None

        if attr == "__tablename__":
            violations.append(
                Violation(
                    p,
                    stmt.lineno,
                    "no-tablename",
                    "Do not set __tablename__; ORMBase derives it from the class name.",
                    c,
                )
            )
            continue
        if value is None or attr is None:
            continue

        kind = call_name(value)
        if kind not in ("mapped_column", "relationship"):
            continue
        assert isinstance(value, ast.Call)
        if not is_mapped(annotation):
            violations.append(
                Violation(
                    p,
                    stmt.lineno,
                    "typed-mapping",
                    f"{kind}(...) must be annotated with Mapped[...].",
                    c,
                    attr,
                )
            )
        if kind == "mapped_column":
            violations.extend(check_column(p, c, attr, annotation, value))
        elif keyword(value, "backref") is not None:
            violations.append(
                Violation(
                    p,
                    value.lineno,
                    "no-backref",
                    "Use back_populates on both sides instead of backref.",
                    c,
                    attr,
                )
            )
    return violations


def check_source(path: Path, source: str) -> list[Violation]:
    p = str(path)
    try:
        tree = ast.parse(source, filename=p)
    except SyntaxError as e:
        return [Violation(p, e.lineno or 0, "parse", f"Could not parse file: {e}")]

    violations = check_imports(p, tree)

    # file-wide checks: legacy Column, backref(), constraint names
    for node in ast.walk(tree):
        name = call_name(node)
        if not isinstance(node, ast.Call):
            continue
        if name == "Column":
            violations.append(
                Violation(
                    p,
                    node.lineno,
                    "no-column",
                    "Use mapped_column(...), not Column(...).",
                )
            )
        elif name == "backref":
            violations.append(
                Violation(
                    p,
                    node.lineno,
                    "no-backref",
                    "Use back_populates on both sides instead of backref().",
                )
            )
        elif name in CONSTRAINT_PREFIXES:
            prefix = CONSTRAINT_PREFIXES[name]
            constraint_name = keyword(node, "name")
            if not (
                isinstance(constraint_name, ast.Constant)
                and isinstance(constraint_name.value, str)
                and constraint_name.value.startswith(prefix)
            ):
                violations.append(
                    Violation(
                        p,
                        node.lineno,
                        "constraint-name",
                        f"{name} needs name='{prefix}<what>'.",
                    )
                )

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            violations.extend(check_class(p, node))
    return violations


def display_path(path: Path) -> Path:
    try:
        return path.resolve().relative_to(REPO_ROOT)
    except ValueError:
        return path


def check_file(path: Path) -> list[Violation]:
    violations = check_source(display_path(path), path.read_text(encoding="utf-8"))
    return sorted(violations, key=lambda v: v.line)


def find_orm_files(root: Path) -> list[Path]:
    return sorted(root.rglob("*_orm.py"))


def main(argv: list[str]) -> int:
    if any(a in ("-h", "--help") for a in argv):
        print(__doc__)
        return 0

    paths = [Path(a) for a in argv]
    if not paths or any(p.name == Path(__file__).name for p in paths):
        files = find_orm_files(SRC_ROOT)
    else:
        files = [p for p in paths if p.name.endswith("_orm.py")]

    violations = [v for f in files for v in check_file(f)]
    for v in violations:
        print(v)
    if violations:
        counts: dict[str, int] = {}
        for v in violations:
            counts[v.rule] = counts.get(v.rule, 0) + 1
        summary = ", ".join(f"{r}: {n}" for r, n in sorted(counts.items()))
        print(
            f"\n{len(violations)} ORM violation(s) in {len(files)} file(s) ({summary})."
        )
        print("Run 'check_orm.py --help' for the rules.")
        return 1
    print(f"All ORM checks passed ({len(files)} file(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
