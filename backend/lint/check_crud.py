#!/usr/bin/env python3
"""
check_crud.py

Enforces the unified conventions for the three CRUD kinds in backend/src:

    *_embedding_crud.py  Weaviate embedding CRUD,  base EmbeddingCRUDBase, first param `client`
    *_elastic_crud.py    Elasticsearch CRUD,       base ElasticCRUDBase,   first param `client`
    *_crud.py            SQL CRUD (everything else), base SQLCRUDBase,     first param `db`

Rules (the rule id is printed with every violation):

    crud-class       Exactly one top-level class whose name starts with 'CRUD'.
    crud-base        The CRUD class derives from the base class of its file kind (see above).
    singleton        A module-level singleton `crud_<name> = CRUD<...>(...)` follows the class.
    method-verb      Public method names start with an allowed verb (ALLOWED_VERBS below;
                     a new verb is added there and in backend-crud.instructions.md);
                     'get' and 'find' are forbidden (use 'read' / 'search'); embedding and
                     elastic CRUDs must not use 'add' / 'remove' (use 'create' / 'delete').
    method-order     Public methods are ordered create -> read -> update -> delete -> other.
    section-comment  Every public method sits below the section comment of its group:
                     `### CREATE|READ|UPDATE|DELETE|OTHER OPERATIONS ###`.
    first-param      The first parameter after self/cls is `db` (SQL) or `client` (embedding/elastic).
    keyword-only     All parameters after the first one are keyword-only (`*` after db/client).
    return-annotation  Every method (except dunder methods) has a return annotation.
    no-commit        No `.commit(` / `.rollback(` calls; transactions belong to the caller.
    no-proj-id       No parameter named `proj_id` (use `project_id`).
    no-read-dto      No method returns a type whose name ends with 'Read' (CRUDs return ORMs / models).
    sql-only         SQL CRUDs touch only the SQL database: no imports of other repos
                     (only repos.db.*), of weaviate / elasticsearch / redis / rq, or of
                     *_embedding_crud, *_elastic_crud, *_collection, *_elastic_index and
                     *_service modules. Side effects on other stores belong in a service.
    no-bulk          SQL CRUDs have no '*_bulk' methods: batch methods are the base
                     '_multi' methods, orchestration of API DTOs belongs in a service.
    generic-dto      SQL overrides of create / create_multi / update / update_multi take
                     exactly the generic DTO types of SQLCRUDBase[ORM, Create, Update]
                     and no extra parameters (create_dto: Create, create_dtos:
                     list[Create], id + update_dto: Update, ids + update_dtos: list[Update]).
    override-multi   SQL CRUDs override create_multi / update_multi / delete_multi, not
                     the single-item create / update / delete (the base delegates them to
                     the _multi methods). Exempt a justified case with the comment
                     `# check_crud: allow override-multi (<reason>)` directly above it.

Usage:
    check_crud.py                 check every *_crud.py file below backend/src
    check_crud.py FILE [FILE...]  check the given files (non-CRUD files are ignored;
                                  passing check_crud.py itself checks everything)
"""

import ast
import re
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SRC_ROOT = REPO_ROOT / "backend" / "src"

# Method groups in their required order. The first four groups are matched by
# their verb; every other allowed verb belongs to the "other" group.
GROUPS = ["create", "read", "update", "delete", "other"]

# Allowed verbs of the "other" group, derived from the existing CRUDs.
OTHER_VERBS = [
    "exists",  # existence checks (exists_by_name, exists_or_create)
    "search",  # similarity / full-text search (embedding and elastic CRUDs)
    "count",  # aggregate counts
    "link",  # create association rows (tags <-> sdocs, spans <-> groups)
    "unlink",  # delete association rows
    "set",  # replace a set of associations (set_tags, set_labels)
    "add",  # SQL only: add to a collection / group (add_to_span_group)
    "remove",  # SQL only: remove from a collection / group (remove_from_span_group)
    "duplicate",  # copy an entity (whiteboards, timeline and cota analyses)
    "merge",  # merge entities (clusters)
    "reorder",  # change the order of entities (search views)
    "associate",  # add a user to a project
    "dissociate",  # remove a user from a project
    "revoke",  # invalidate a token
    "favorite",  # mark a memo as favorite
    "unfavorite",  # unmark a memo as favorite
]
ALLOWED_VERBS = GROUPS[:4] + OTHER_VERBS
FORBIDDEN_VERBS = {"get": "read", "find": "read' or 'search"}
# Verbs that only SQL CRUDs may use (association rows); the others say create/delete.
SQL_ONLY_VERBS = {"add": "create", "remove": "delete"}

SECTION_RE = re.compile(r"^\s*###\s*([A-Z]+)\s+OPERATIONS\s*###\s*$")


@dataclass(frozen=True)
class CrudKind:
    name: str
    base: str
    first_param: str


SQL = CrudKind("SQL", "SQLCRUDBase", "db")
EMBEDDING = CrudKind("embedding", "EmbeddingCRUDBase", "client")
ELASTIC = CrudKind("elastic", "ElasticCRUDBase", "client")

# sql-only: modules a SQL CRUD must not import (other stores and services)
FORBIDDEN_SQL_IMPORT_ROOTS = {"weaviate", "elasticsearch", "redis", "rq"}
FORBIDDEN_SQL_IMPORT_SUFFIXES = (
    "_embedding_crud",
    "_elastic_crud",
    "_collection",
    "_elastic_index",
    "_service",
)


# generic-dto: parameters (besides db) of the overridable base write methods and the
# type of their DTO parameter ({create} / {update} are the generic DTO types)
BASE_WRITE_SIGNATURES = {
    "create": ({"create_dto"}, "create_dto", "{create}"),
    "create_multi": ({"create_dtos"}, "create_dtos", "list[{create}]"),
    "update": ({"id", "update_dto"}, "update_dto", "{update}"),
    "update_multi": ({"ids", "update_dtos"}, "update_dtos", "list[{update}]"),
}

# override-multi: single-item base methods and the _multi method to override instead
SINGLE_TO_MULTI = {
    "create": "create_multi",
    "update": "update_multi",
    "delete": "delete_multi",
}
ALLOW_RE = re.compile(r"#\s*check_crud:\s*allow\s+([\w-]+)")


def generic_params(crud_class: ast.ClassDef) -> tuple[str, str] | None:
    """The (Create, Update) DTO type names of `SQLCRUDBase[ORM, Create, Update]`."""
    for b in crud_class.bases:
        if (
            isinstance(b, ast.Subscript)
            and base_name(b) == SQL.base
            and isinstance(b.slice, ast.Tuple)
            and len(b.slice.elts) == 3
        ):
            return ast.unparse(b.slice.elts[1]), ast.unparse(b.slice.elts[2])
    return None


def allowed_rules(
    lines: list[str], func: ast.FunctionDef | ast.AsyncFunctionDef
) -> set[str]:
    """Rules exempted by a `# check_crud: allow <rule>` comment directly above `func`."""
    def_line = func.decorator_list[0].lineno if func.decorator_list else func.lineno
    above = lines[def_line - 2] if def_line >= 2 else ""
    return set(ALLOW_RE.findall(above))


def forbidden_sql_import(module: str) -> str | None:
    """Why a SQL CRUD must not import `module`, or None if it may."""
    root = module.split(".")[0]
    if root in FORBIDDEN_SQL_IMPORT_ROOTS:
        return f"'{module}' is another store"
    if root == "repos" and not module.startswith("repos.db."):
        return f"'{module}' is another repo (only repos.db.* is allowed)"
    if module.endswith(FORBIDDEN_SQL_IMPORT_SUFFIXES):
        return f"'{module}' belongs to another store or a service"
    return None


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


def crud_kind(path: Path) -> CrudKind:
    if path.name.endswith("_embedding_crud.py"):
        return EMBEDDING
    if path.name.endswith("_elastic_crud.py"):
        return ELASTIC
    return SQL


def unknown_verb_message(verb: str) -> str:
    """How to fix a method whose verb is not in ALLOWED_VERBS."""
    return (
        f"Verb '{verb}' is not allowed. Rename the method so it starts with an "
        f"existing verb: {', '.join(GROUPS[:4])} for the basic operations, or one of "
        f"the OTHER verbs: {', '.join(OTHER_VERBS)}. Only if none of them fits, add "
        f"the new verb with a comment to OTHER_VERBS in backend/lint/check_crud.py "
        f"and to the Verbs rule in .github/instructions/backend-crud.instructions.md."
    )


def method_verb(name: str) -> str:
    return name.lstrip("_").split("_")[0]


def method_group(name: str) -> str:
    verb = method_verb(name)
    if verb in FORBIDDEN_VERBS:
        return "read"
    return verb if verb in GROUPS[:4] else "other"


def base_name(node: ast.expr) -> str | None:
    if isinstance(node, ast.Subscript):
        node = node.value
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def annotation_names(node: ast.expr) -> list[str]:
    """All type names referenced by an annotation, including string annotations."""
    names = []
    for sub in ast.walk(node):
        if isinstance(sub, ast.Name):
            names.append(sub.id)
        elif isinstance(sub, ast.Attribute):
            names.append(sub.attr)
        elif isinstance(sub, ast.Constant) and isinstance(sub.value, str):
            try:
                names.extend(annotation_names(ast.parse(sub.value, mode="eval").body))
            except SyntaxError:
                pass
    return names


def is_static(func: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    return any(
        isinstance(d, ast.Name) and d.id == "staticmethod" for d in func.decorator_list
    )


def check_source(path: Path, source: str) -> list[Violation]:
    p = str(path)
    try:
        tree = ast.parse(source, filename=p)
    except SyntaxError as e:
        return [Violation(p, e.lineno or 0, "parse", f"Could not parse file: {e}")]

    kind = crud_kind(path)
    violations: list[Violation] = []

    # no-commit / no-proj-id / sql-only apply to the whole file
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr in ("commit", "rollback")
        ):
            violations.append(
                Violation(p, node.lineno, "no-commit", f"Calls .{node.func.attr}().")
            )
        if kind is SQL and isinstance(node, (ast.Import, ast.ImportFrom)):
            modules = (
                [a.name for a in node.names]
                if isinstance(node, ast.Import)
                else [node.module or ""]
            )
            for module in modules:
                reason = forbidden_sql_import(module)
                if reason:
                    violations.append(
                        Violation(
                            p,
                            node.lineno,
                            "sql-only",
                            f"SQL CRUDs only touch the SQL database: {reason}. "
                            "Move the side effect into a service that calls this CRUD.",
                        )
                    )
        if isinstance(node, ast.arg) and node.arg == "proj_id":
            violations.append(
                Violation(
                    p,
                    node.lineno,
                    "no-proj-id",
                    "Parameter 'proj_id' (use 'project_id').",
                )
            )

    # crud-class
    crud_classes = [
        n
        for n in tree.body
        if isinstance(n, ast.ClassDef) and n.name.startswith("CRUD")
    ]
    if len(crud_classes) != 1:
        found = ", ".join(c.name for c in crud_classes) or "none"
        violations.append(
            Violation(
                p,
                1,
                "crud-class",
                f"Expected exactly one class 'CRUD<...>', found: {found}.",
            )
        )
    if not crud_classes:
        return violations
    crud_class = crud_classes[0]
    c = crud_class.name

    # crud-base
    bases = [base_name(b) for b in crud_class.bases]
    if kind.base not in bases:
        violations.append(
            Violation(
                p,
                crud_class.lineno,
                "crud-base",
                f"{kind.name} CRUD must derive from '{kind.base}' (found: {', '.join(str(b) for b in bases) or 'none'}).",
                cls=c,
            )
        )

    # singleton
    has_singleton = any(
        isinstance(n, ast.Assign)
        and n.lineno > crud_class.lineno
        and any(isinstance(t, ast.Name) and t.id.startswith("crud_") for t in n.targets)
        and isinstance(n.value, ast.Call)
        and isinstance(n.value.func, ast.Name)
        and n.value.func.id == c
        for n in tree.body
    )
    if not has_singleton:
        violations.append(
            Violation(
                p,
                crud_class.lineno,
                "singleton",
                f"Missing module-level singleton 'crud_<name> = {c}(...)' after the class.",
                cls=c,
            )
        )

    methods = [
        n
        for n in crud_class.body
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
        and not (n.name.startswith("__") and n.name.endswith("__"))
    ]
    public = [m for m in methods if not m.name.startswith("_")]

    # section comments inside the class body: (line, group)
    lines = source.splitlines()
    end = crud_class.end_lineno or len(lines)
    sections = [
        (i + 1, m.group(1).lower())
        for i in range(crud_class.lineno, end)
        if (m := SECTION_RE.match(lines[i]))
    ]

    last_group_idx = -1
    for m in public:
        v = method_verb(m.name)
        group = method_group(m.name)

        # method-verb
        if v in FORBIDDEN_VERBS:
            violations.append(
                Violation(
                    p,
                    m.lineno,
                    "method-verb",
                    f"Verb '{v}' is forbidden, use '{FORBIDDEN_VERBS[v]}'.",
                    c,
                    m.name,
                )
            )
        elif v in SQL_ONLY_VERBS and kind is not SQL:
            violations.append(
                Violation(
                    p,
                    m.lineno,
                    "method-verb",
                    f"Verb '{v}' is only allowed in SQL CRUDs, use '{SQL_ONLY_VERBS[v]}'.",
                    c,
                    m.name,
                )
            )
        elif v not in ALLOWED_VERBS:
            violations.append(
                Violation(
                    p,
                    m.lineno,
                    "method-verb",
                    unknown_verb_message(v),
                    c,
                    m.name,
                )
            )

        # method-order
        group_idx = GROUPS.index(group)
        if group_idx < last_group_idx:
            violations.append(
                Violation(
                    p,
                    m.lineno,
                    "method-order",
                    f"'{group}' method after a '{GROUPS[last_group_idx]}' method "
                    "(order: create, read, update, delete, other).",
                    c,
                    m.name,
                )
            )
        last_group_idx = max(last_group_idx, group_idx)

        # section-comment
        def_line = m.decorator_list[0].lineno if m.decorator_list else m.lineno
        above = [s for s in sections if s[0] < def_line]
        section = above[-1][1] if above else None
        if section != group:
            found = f"'### {section.upper()} OPERATIONS ###'" if section else "none"
            violations.append(
                Violation(
                    p,
                    m.lineno,
                    "section-comment",
                    f"Must be below '### {group.upper()} OPERATIONS ###' (found: {found}).",
                    c,
                    m.name,
                )
            )

        # first-param / keyword-only
        positional = m.args.posonlyargs + m.args.args
        if not is_static(m):
            positional = positional[1:]
        first = positional[0].arg if positional else None
        if first != kind.first_param:
            violations.append(
                Violation(
                    p,
                    m.lineno,
                    "first-param",
                    f"First parameter must be '{kind.first_param}' (found: {first or 'none'}).",
                    c,
                    m.name,
                )
            )
        extra = positional[1:] if first == kind.first_param else positional
        extra_names = [a.arg for a in extra]
        if m.args.vararg:
            extra_names.append(f"*{m.args.vararg.arg}")
        if extra_names:
            violations.append(
                Violation(
                    p,
                    m.lineno,
                    "keyword-only",
                    f"Parameters after '{kind.first_param}' must be keyword-only: {', '.join(extra_names)}.",
                    c,
                    m.name,
                )
            )

    # no-bulk / generic-dto / override-multi (SQL only)
    if kind is SQL:
        dto_types = generic_params(crud_class)
        for m in methods:
            if m.name.endswith("_bulk") and not m.name.startswith("_"):
                violations.append(
                    Violation(
                        p,
                        m.lineno,
                        "no-bulk",
                        "No '*_bulk' methods: use the base '_multi' methods and move "
                        "orchestration of API DTOs into a service.",
                        c,
                        m.name,
                    )
                )
            if m.name in BASE_WRITE_SIGNATURES and dto_types is not None:
                names, dto_param, dto_type = BASE_WRITE_SIGNATURES[m.name]
                expected_type = dto_type.format(
                    create=dto_types[0], update=dto_types[1]
                )
                params = {a.arg: a for a in m.args.kwonlyargs}
                annotation = (
                    params[dto_param].annotation if dto_param in params else None
                )
                found_type = ast.unparse(annotation) if annotation is not None else None
                if set(params) != names or found_type != expected_type:
                    violations.append(
                        Violation(
                            p,
                            m.lineno,
                            "generic-dto",
                            f"Must take exactly {', '.join(sorted(names))} with "
                            f"{dto_param}: {expected_type} (found: "
                            f"{', '.join(params) or 'none'}; {dto_param}: {found_type}).",
                            c,
                            m.name,
                        )
                    )
            if m.name in SINGLE_TO_MULTI and "override-multi" not in allowed_rules(
                lines, m
            ):
                violations.append(
                    Violation(
                        p,
                        m.lineno,
                        "override-multi",
                        f"Override '{SINGLE_TO_MULTI[m.name]}' instead: the base "
                        f"'{m.name}' delegates to it, so both paths get the handling.",
                        c,
                        m.name,
                    )
                )

    for m in methods:
        # return-annotation
        if m.returns is None:
            violations.append(
                Violation(
                    p,
                    m.lineno,
                    "return-annotation",
                    "Missing return annotation.",
                    c,
                    m.name,
                )
            )
            continue
        # no-read-dto
        read_types = sorted(
            {n for n in annotation_names(m.returns) if n.endswith("Read")}
        )
        if read_types:
            violations.append(
                Violation(
                    p,
                    m.lineno,
                    "no-read-dto",
                    f"Returns Read DTO(s): {', '.join(read_types)}.",
                    c,
                    m.name,
                )
            )

    return violations


def display_path(path: Path) -> Path:
    try:
        return path.resolve().relative_to(REPO_ROOT)
    except ValueError:
        return path


def check_file(path: Path) -> list[Violation]:
    violations = check_source(display_path(path), path.read_text(encoding="utf-8"))
    return sorted(violations, key=lambda v: v.line)


def find_crud_files(root: Path) -> list[Path]:
    return sorted(root.rglob("*_crud.py"))


def main(argv: list[str]) -> int:
    if any(a in ("-h", "--help") for a in argv):
        print(__doc__)
        return 0

    paths = [Path(a) for a in argv]
    if not paths or any(p.name == Path(__file__).name for p in paths):
        files = find_crud_files(SRC_ROOT)
    else:
        files = [p for p in paths if p.name.endswith("_crud.py")]

    violations = [v for f in files for v in check_file(f)]
    for v in violations:
        print(v)
    if violations:
        counts: dict[str, int] = {}
        for v in violations:
            counts[v.rule] = counts.get(v.rule, 0) + 1
        summary = ", ".join(f"{r}: {n}" for r, n in sorted(counts.items()))
        print(
            f"\n{len(violations)} CRUD violation(s) in {len(files)} file(s) ({summary})."
        )
        print("Run 'check_crud.py --help' for the rules.")
        return 1
    print(f"All CRUD checks passed ({len(files)} file(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
