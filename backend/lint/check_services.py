#!/usr/bin/env python3
"""
check_services.py

Enforces the unified conventions for the *_service.py files in backend/src.

A service is a singleton class `<Name>Service(metaclass=SingletonMeta)` named after
its file (`word_frequency_service.py` -> `WordFrequencyService`) that sets its
dependencies as class attributes in `__new__(cls, *args, **kwargs)`.

Rules (the rule id is printed with every violation):

    no-endpoint-import  No import of a *_endpoint module.
    service-class       Exactly one top-level class '<Name>Service' named after the file,
                        declared with `metaclass=SingletonMeta`.
    new-signature       The service defines `__new__(cls, *args, **kwargs)`, returns
                        `super(<Name>Service, cls).__new__(cls)` and has no `__init__`.
    module-function     No public module-level functions (put them on the service or
                        prefix them with '_').
    no-http             No HTTPException and no fastapi/starlette `status` (raise domain
                        exceptions from *_exceptions.py instead).
    no-bare-exception   No `raise Exception(...)` (raise a domain exception instead).
    no-commit           No `.commit()` / `.rollback()` calls and no `.add()` / `.add_all()`
                        on a session (`db` / `session`); SQLRepo.transaction() owns
                        transactions, CRUDs write.
    no-events           No DATSEvent / websocket imports and no `emit_*` calls; the
                        endpoint emits after the service call.
    no-exception-class  No exception classes; they live in <module>_exceptions.py.

Documented variations (VARIATIONS below) skip the shape rules that do not apply:

    systems   JobService / WebsocketService: SingletonMeta with `__init__` state
              (skip new-signature; the websocket system may use events).
    per-job   PerspectivesService(job): a plain class created per job run
              (skip service-class and new-signature).
    strategy  classifier/models/*_class_model_service.py: an ABC hierarchy selected
              by ClassifierService (skip service-class and new-signature).

Usage:
    check_services.py                 check every *_service.py file below backend/src
    check_services.py FILE [FILE...]  check the given files (non-service files are ignored;
                                      passing check_services.py itself checks everything)
"""

import ast
import re
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SRC_ROOT = REPO_ROOT / "backend" / "src"

SYSTEMS = "systems"
PER_JOB = "per-job"
STRATEGY = "strategy"

# Path suffix (relative to backend/src) -> variation.
VARIATIONS: dict[str, str] = {
    "systems/job_system/job_service.py": SYSTEMS,
    "systems/websocket_system/websocket_service.py": SYSTEMS,
    "modules/perspectives/perspectives_service.py": PER_JOB,
}
STRATEGY_RE = re.compile(r"modules/classifier/models/\w+_model_service\.py$")

SESSION_NAMES = {"db", "session", "db_session"}
EVENT_NAMES = {
    "DATSEvent",
    "DATSEventBase",
    "WebsocketService",
    "WebsocketEmitter",
}
BUILTIN_EXCEPTIONS = {
    n
    for n in dir(__builtins__ if isinstance(__builtins__, dict) else __builtins__)
    if n.endswith(("Error", "Exception", "Exit", "Interrupt"))
    or n in ("Exception", "BaseException")
}


@dataclass(frozen=True)
class Violation:
    path: str
    line: int
    rule: str
    message: str
    cls: str | None = None
    method: str | None = None

    def __str__(self) -> str:
        where = ".".join(x for x in (self.cls, self.method) if x)
        where = f" {where}:" if where else ""
        return f"{self.path}:{self.line}: [{self.rule}]{where} {self.message}"


def variation(path: Path) -> str | None:
    p = path.as_posix()
    if STRATEGY_RE.search(p):
        return STRATEGY
    for suffix, kind in VARIATIONS.items():
        if p.endswith(suffix):
            return kind
    return None


def expected_class_name(path: Path) -> str:
    """word_frequency_service.py -> wordfrequencyservice (compared case-insensitively)."""
    return path.stem.replace("_", "").lower()


def name_of(node: ast.expr) -> str | None:
    if isinstance(node, ast.Subscript):
        node = node.value
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def is_exception_base(node: ast.expr) -> bool:
    n = name_of(node)
    return n is not None and (
        n in BUILTIN_EXCEPTIONS or n.endswith(("Error", "Exception"))
    )


def has_singleton_meta(cls: ast.ClassDef) -> bool:
    return any(
        k.arg == "metaclass" and name_of(k.value) == "SingletonMeta"
        for k in cls.keywords
    )


def check_new(cls: ast.ClassDef, p: str) -> list[Violation]:
    c = cls.name
    violations: list[Violation] = []
    funcs = {
        n.name: n
        for n in cls.body
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
    }
    if "__init__" in funcs:
        violations.append(
            Violation(
                p,
                funcs["__init__"].lineno,
                "new-signature",
                "Defines __init__; set dependencies as class attributes in __new__.",
                c,
                "__init__",
            )
        )
    new = funcs.get("__new__")
    if new is None:
        violations.append(
            Violation(p, cls.lineno, "new-signature", "Missing __new__.", c)
        )
        return violations

    args = new.args
    ok = (
        [a.arg for a in args.posonlyargs + args.args] == ["cls"]
        and args.vararg is not None
        and args.kwarg is not None
        and not args.kwonlyargs
    )
    if not ok:
        violations.append(
            Violation(
                p,
                new.lineno,
                "new-signature",
                "Signature must be '__new__(cls, *args, **kwargs)'.",
                c,
                "__new__",
            )
        )

    expected = f"super({c}, cls).__new__(cls)"
    returns = [
        ast.unparse(n.value)
        for n in ast.walk(new)
        if isinstance(n, ast.Return) and n.value is not None
    ]
    if returns != [expected]:
        violations.append(
            Violation(
                p,
                new.lineno,
                "new-signature",
                f"Must return '{expected}'.",
                c,
                "__new__",
            )
        )
    return violations


def enclosing(tree: ast.Module) -> dict[ast.AST, tuple[str | None, str | None]]:
    """Map every node to its enclosing (class, function) names for messages."""
    owners: dict[ast.AST, tuple[str | None, str | None]] = {}

    def visit(node: ast.AST, cls: str | None, func: str | None) -> None:
        for child in ast.iter_child_nodes(node):
            c, f = cls, func
            if isinstance(child, ast.ClassDef):
                c, f = child.name, None
            elif isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                f = child.name if func is None else func
            owners[child] = (c, f)
            visit(child, c, f)

    visit(tree, None, None)
    return owners


def check_source(path: Path, source: str) -> list[Violation]:
    p = str(path)
    try:
        tree = ast.parse(source, filename=p)
    except SyntaxError as e:
        return [Violation(p, e.lineno or 0, "parse", f"Could not parse file: {e}")]

    kind = variation(path)
    owners = enclosing(tree)
    violations: list[Violation] = []

    def add(node: ast.AST, rule: str, message: str) -> None:
        cls, func = owners.get(node, (None, None))
        violations.append(
            Violation(p, getattr(node, "lineno", 1), rule, message, cls, func)
        )

    for node in ast.walk(tree):
        # imports: no-endpoint-import, no-http, no-events
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            modules = (
                [a.name for a in node.names]
                if isinstance(node, ast.Import)
                else [node.module or ""]
            )
            names = [a.name for a in node.names]
            if any(re.search(r"_endpoint$", m) for m in modules):
                add(node, "no-endpoint-import", f"Imports {', '.join(modules)}.")
            if "HTTPException" in names:
                add(node, "no-http", "Imports HTTPException.")
            if "status" in names and any(
                m.split(".")[0] in ("fastapi", "starlette") for m in modules
            ):
                add(node, "no-http", "Imports the fastapi/starlette status codes.")
            if kind != SYSTEMS:
                events = sorted(
                    {n for n in names if n in EVENT_NAMES}
                    | {m for m in modules if m.endswith("dats_event")}
                )
                if events:
                    add(node, "no-events", f"Imports {', '.join(events)}.")

        elif isinstance(node, ast.Raise) and node.exc is not None:
            exc = node.exc.func if isinstance(node.exc, ast.Call) else node.exc
            if name_of(exc) == "Exception":
                add(node, "no-bare-exception", "Raises bare Exception.")
            if name_of(exc) == "HTTPException":
                add(node, "no-http", "Raises HTTPException.")

        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            attr = node.func.attr
            receiver = node.func.value
            if attr in ("commit", "rollback"):
                add(node, "no-commit", f"Calls .{attr}().")
            elif (
                attr in ("add", "add_all")
                and isinstance(receiver, ast.Name)
                and receiver.id in SESSION_NAMES
            ):
                add(node, "no-commit", f"Calls {receiver.id}.{attr}().")
            elif attr.startswith("emit_") and kind != SYSTEMS:
                add(node, "no-events", f"Calls .{attr}().")

        elif isinstance(node, ast.ClassDef) and any(
            is_exception_base(b) for b in node.bases
        ):
            add(
                node,
                "no-exception-class",
                f"Defines exception class '{node.name}' (move it to a *_exceptions.py).",
            )

    # module-function
    for node in tree.body:
        if isinstance(
            node, (ast.FunctionDef, ast.AsyncFunctionDef)
        ) and not node.name.startswith("_"):
            violations.append(
                Violation(
                    p,
                    node.lineno,
                    "module-function",
                    f"Public module-level function '{node.name}' (make it a method of the service).",
                )
            )

    if kind in (PER_JOB, STRATEGY):
        return violations

    # service-class
    expected = expected_class_name(path)
    services = [
        n
        for n in tree.body
        if isinstance(n, ast.ClassDef) and n.name.endswith("Service")
    ]
    matching = [s for s in services if s.name.lower() == expected]
    if len(services) != 1 or not matching:
        found = ", ".join(s.name for s in services) or "none"
        violations.append(
            Violation(
                p,
                1,
                "service-class",
                f"Expected exactly one service class named after the file "
                f"(case-insensitive '{expected}'), found: {found}.",
            )
        )
    for service in matching:
        if not has_singleton_meta(service):
            violations.append(
                Violation(
                    p,
                    service.lineno,
                    "service-class",
                    "Must be declared with 'metaclass=SingletonMeta'.",
                    service.name,
                )
            )
        if kind != SYSTEMS:
            violations.extend(check_new(service, p))

    return violations


def display_path(path: Path) -> Path:
    try:
        return path.resolve().relative_to(REPO_ROOT)
    except ValueError:
        return path


def check_file(path: Path) -> list[Violation]:
    violations = check_source(display_path(path), path.read_text(encoding="utf-8"))
    return sorted(violations, key=lambda v: v.line)


def find_service_files(root: Path) -> list[Path]:
    return sorted(root.rglob("*_service.py"))


def main(argv: list[str]) -> int:
    if any(a in ("-h", "--help") for a in argv):
        print(__doc__)
        return 0

    paths = [Path(a) for a in argv]
    if not paths or any(p.name == Path(__file__).name for p in paths):
        files = find_service_files(SRC_ROOT)
    else:
        files = [p for p in paths if p.name.endswith("_service.py")]

    violations = [v for f in files for v in check_file(f)]
    for v in violations:
        print(v)
    if violations:
        counts: dict[str, int] = {}
        for v in violations:
            counts[v.rule] = counts.get(v.rule, 0) + 1
        summary = ", ".join(f"{r}: {n}" for r, n in sorted(counts.items()))
        print(
            f"\n{len(violations)} service violation(s) in {len(files)} file(s) ({summary})."
        )
        print("Run 'check_services.py --help' for the rules.")
        return 1
    print(f"All service checks passed ({len(files)} file(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
