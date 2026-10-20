#!/usr/bin/env python3
"""
check_dtos.py

Enforces the conventions for the Pydantic DTO modules (*_dto.py) in backend/src.

Rules (the rule id is printed with every violation):

    forbidden-import     No runtime import of *_orm, *_crud, *_service, *_repo or *_endpoint
                         modules (imports under `if TYPE_CHECKING:` are allowed).
    field-description    Every field of a model is declared as `name: T = Field(description="...")`
                         (defaults and constraints go inside `Field`). ClassVars, private
                         attributes and `model_config` are exempt.
    no-class-config      No nested `class Config` (use `model_config = ConfigDict(...)`).
    modern-typing        No `typing.List/Dict/Set/FrozenSet/Tuple/Type/Optional/Union`
                         (use `list[T]`, `dict[K, V]`, `T | None`, `A | B`, ...).
    str-enum             Enums are `(str, Enum)` or `StrEnum`. Int-valued enums
                         (`IntEnum`, `(int, Enum)`) are allowed because their wire values are
                         ints; a plain `Enum` without a value type is not.
    update-base          Classes named `*Update`, `*UpdateBulk` or `*UpdateIntern` inherit
                         `UpdateDTOBase` (directly or through a base class), so empty updates
                         are rejected. Other classes do not inherit it directly.
    read-from-attributes `<Entity>Read` classes set `model_config = ConfigDict(from_attributes=True)`
                         (directly or through a base class) when `<Entity>ORM` exists in a
                         *_orm.py module, i.e. when the Read DTO is built from that ORM.
                         A Read DTO that is not built from its ORM opts out explicitly with
                         `from_attributes=False`.
    discriminator-tag    A `Literal[...]` field used as a union `discriminator=` in the module is
                         required (no default), e.g. the `<feature>_job_type` tag of job params.
    no-exception         No exception classes; they live in `<module>_exceptions.py`.

Base classes are resolved by name across all DTO modules (plus the DTO base modules in
repos/), so inherited `UpdateDTOBase` / `from_attributes` are found in other files too.

Usage:
    check_dtos.py                 check every *_dto.py file below backend/src
    check_dtos.py FILE [FILE...]  check the given files (non-DTO files are ignored;
                                  passing check_dtos.py itself checks everything)
"""

import ast
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SRC_ROOT = REPO_ROOT / "backend" / "src"

# Non-*_dto.py modules that define DTO base classes, indexed for base resolution.
BASE_MODULES = [
    SRC_ROOT / "repos" / "db" / "dto_base.py",
    SRC_ROOT / "repos" / "elastic" / "elastic_dto_base.py",
    SRC_ROOT / "repos" / "vector" / "weaviate_models.py",
]

FORBIDDEN_MODULE_SUFFIXES = ("_orm", "_crud", "_service", "_repo", "_endpoint")
LEGACY_TYPING = {
    "List": "list[T]",
    "Dict": "dict[K, V]",
    "Set": "set[T]",
    "FrozenSet": "frozenset[T]",
    "Tuple": "tuple[...]",
    "Type": "type[T]",
    "Optional": "T | None",
    "Union": "A | B",
}
ENUM_BASES = {"Enum", "StrEnum", "IntEnum", "Flag", "IntFlag"}
INT_ENUM_BASES = {"IntEnum", "IntFlag", "int"}
STR_ENUM_BASES = {"StrEnum", "str"}
EXCEPTION_BASES = {"Exception", "BaseException"}
# Bases that do not make a class a Pydantic model on their own.
NON_MODEL_BASES = {"object", "Generic", "ABC", "Protocol", "TypedDict", "NamedTuple"}
UPDATE_RE = re.compile(r"Update(Bulk|Intern)?$")


@dataclass(frozen=True)
class Violation:
    path: str
    line: int
    rule: str
    message: str
    cls: str | None = None
    field: str | None = None

    def __str__(self) -> str:
        where = ".".join(x for x in (self.cls, self.field) if x)
        where = f" {where}:" if where else ""
        return f"{self.path}:{self.line}: [{self.rule}]{where} {self.message}"


@dataclass
class ClassInfo:
    bases: list[str]
    update_base: bool = False
    # True/False when the class sets from_attributes in its model_config, else None
    from_attributes: bool | None = None


@dataclass
class Index:
    """Class name -> info of all classes in the DTO modules, plus the ORM entity names."""

    classes: dict[str, ClassInfo] = field(default_factory=dict)
    orm_entities: set[str] = field(default_factory=set)

    def add_module(self, tree: ast.Module) -> None:
        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                self.classes.setdefault(node.name, class_info(node))

    def _reaches(self, name: str, predicate, seen: set[str] | None = None) -> bool:
        seen = seen if seen is not None else set()
        if name in seen:
            return False
        seen.add(name)
        info = self.classes.get(name)
        if info is None:
            return False
        if predicate(name, info):
            return True
        return any(self._reaches(b, predicate, seen) for b in info.bases)

    def base_names(self, name: str, seen: set[str] | None = None) -> set[str]:
        """All (transitive) base names of a class, as far as they are indexed."""
        seen = seen if seen is not None else set()
        info = self.classes.get(name)
        if info is None or name in seen:
            return set()
        seen.add(name)
        result = set(info.bases)
        for b in info.bases:
            result |= self.base_names(b, seen)
        return result

    def has_update_base(self, name: str) -> bool:
        return self._reaches(
            name, lambda n, i: i.update_base or "UpdateDTOBase" in i.bases
        )

    def sets_from_attributes(self, name: str) -> bool:
        """Whether the class or a base sets from_attributes (True or False)."""
        return self._reaches(name, lambda n, i: i.from_attributes is not None)


def base_name(node: ast.expr) -> str | None:
    if isinstance(node, ast.Subscript):
        node = node.value
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def call_name(node: ast.expr | None) -> str | None:
    if isinstance(node, ast.Call):
        return base_name(node.func)
    return None


def keyword(call: ast.Call, name: str) -> ast.keyword | None:
    return next((k for k in call.keywords if k.arg == name), None)


def from_attributes_value(cls: ast.ClassDef) -> bool | None:
    for node in cls.body:
        if not isinstance(node, (ast.Assign, ast.AnnAssign)):
            continue
        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
        if not any(isinstance(t, ast.Name) and t.id == "model_config" for t in targets):
            continue
        value = node.value
        if isinstance(value, ast.Call):
            kw = keyword(value, "from_attributes")
            if kw is not None and isinstance(kw.value, ast.Constant):
                return bool(kw.value.value)
    return None


def class_info(cls: ast.ClassDef) -> ClassInfo:
    bases = [b for b in (base_name(x) for x in cls.bases) if b]
    return ClassInfo(
        bases=bases,
        update_base=cls.name == "UpdateDTOBase",
        from_attributes=from_attributes_value(cls),
    )


def is_type_checking(test: ast.expr) -> bool:
    return base_name(test) == "TYPE_CHECKING"


def runtime_imports(tree: ast.Module) -> list[ast.Import | ast.ImportFrom]:
    """All imports except those below an `if TYPE_CHECKING:` block."""
    result: list[ast.Import | ast.ImportFrom] = []

    def visit(node: ast.AST) -> None:
        if isinstance(node, ast.If) and is_type_checking(node.test):
            for child in node.orelse:
                visit(child)
            return
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            result.append(node)
        for child in ast.iter_child_nodes(node):
            visit(child)

    visit(tree)
    return result


def forbidden_modules(node: ast.Import | ast.ImportFrom) -> list[str]:
    def forbidden(module: str) -> bool:
        return module.split(".")[-1].endswith(FORBIDDEN_MODULE_SUFFIXES)

    if isinstance(node, ast.Import):
        return [a.name for a in node.names if forbidden(a.name)]
    module = node.module or ""
    if forbidden(module):
        return [module]
    return [f"{module}.{a.name}" for a in node.names if forbidden(a.name)]


def is_class_var(annotation: ast.expr) -> bool:
    return base_name(annotation) == "ClassVar"


def is_literal(annotation: ast.expr) -> bool:
    return base_name(annotation) == "Literal"


def discriminators(tree: ast.Module) -> set[str]:
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and call_name(node) == "Field":
            kw = keyword(node, "discriminator")
            if (
                kw is not None
                and isinstance(kw.value, ast.Constant)
                and isinstance(kw.value.value, str)
            ):
                names.add(kw.value.value)
    return names


def check_source(
    path: Path, source: str, index: Index | None = None
) -> list[Violation]:
    p = str(path)
    try:
        tree = ast.parse(source, filename=p)
    except SyntaxError as e:
        return [Violation(p, e.lineno or 0, "parse", f"Could not parse file: {e}")]

    if index is None:
        index = Index()
    # classes of this file take precedence over equally named ones elsewhere
    local = Index(orm_entities=index.orm_entities)
    local.add_module(tree)
    for name, info in index.classes.items():
        local.classes.setdefault(name, info)
    index = local

    violations: list[Violation] = []

    # forbidden-import
    for node in runtime_imports(tree):
        for module in forbidden_modules(node):
            violations.append(
                Violation(
                    p,
                    node.lineno,
                    "forbidden-import",
                    f"Imports '{module}' at runtime (DTOs must not import ORM/CRUD/service/"
                    "repo/endpoint modules; use `if TYPE_CHECKING:` for type hints).",
                )
            )

    # modern-typing
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module in (
            "typing",
            "typing_extensions",
        ):
            for a in node.names:
                if a.name in LEGACY_TYPING:
                    violations.append(
                        Violation(
                            p,
                            node.lineno,
                            "modern-typing",
                            f"Imports typing.{a.name} (use {LEGACY_TYPING[a.name]}).",
                        )
                    )
        if (
            isinstance(node, ast.Attribute)
            and isinstance(node.value, ast.Name)
            and node.value.id == "typing"
            and node.attr in LEGACY_TYPING
        ):
            violations.append(
                Violation(
                    p,
                    node.lineno,
                    "modern-typing",
                    f"Uses typing.{node.attr} (use {LEGACY_TYPING[node.attr]}).",
                )
            )

    tags = discriminators(tree)

    for cls in (n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)):
        c = cls.name
        all_bases = index.base_names(c)
        direct = set(index.classes[c].bases) if c in index.classes else set()

        # no-class-config
        for node in cls.body:
            if isinstance(node, ast.ClassDef) and node.name == "Config":
                violations.append(
                    Violation(
                        p,
                        node.lineno,
                        "no-class-config",
                        "Nested 'class Config' (use model_config = ConfigDict(...)).",
                        c,
                    )
                )

        # no-exception
        if all_bases & EXCEPTION_BASES or any(
            b.endswith(("Error", "Exception")) for b in all_bases
        ):
            violations.append(
                Violation(
                    p,
                    cls.lineno,
                    "no-exception",
                    "Exception class in a DTO module (move it to <module>_exceptions.py).",
                    c,
                )
            )
            continue

        # str-enum
        if all_bases & ENUM_BASES:
            if not all_bases & (STR_ENUM_BASES | INT_ENUM_BASES):
                violations.append(
                    Violation(
                        p,
                        cls.lineno,
                        "str-enum",
                        "Enum without value type (use '(str, Enum)' or 'StrEnum').",
                        c,
                    )
                )
            continue

        if not direct - NON_MODEL_BASES:
            continue  # plain class, not a Pydantic model

        # update-base
        if UPDATE_RE.search(c) and not index.has_update_base(c):
            violations.append(
                Violation(
                    p,
                    cls.lineno,
                    "update-base",
                    "Update DTO does not inherit UpdateDTOBase "
                    "(class <Entity>Update(BaseModel, UpdateDTOBase)).",
                    c,
                )
            )
        if not UPDATE_RE.search(c) and "UpdateDTOBase" in direct:
            violations.append(
                Violation(
                    p,
                    cls.lineno,
                    "update-base",
                    "Only Update DTOs inherit UpdateDTOBase (it rejects instances that "
                    "set none of their optional fields).",
                    c,
                )
            )

        # read-from-attributes
        if (
            c.endswith("Read")
            and c[: -len("Read")] in index.orm_entities
            and not index.sets_from_attributes(c)
        ):
            violations.append(
                Violation(
                    p,
                    cls.lineno,
                    "read-from-attributes",
                    f"Read DTO of {c[: -len('Read')]}ORM does not set "
                    "model_config = ConfigDict(from_attributes=True) "
                    "(or from_attributes=False if it is not built from the ORM).",
                    c,
                )
            )

        for node in cls.body:
            if not isinstance(node, ast.AnnAssign) or not isinstance(
                node.target, ast.Name
            ):
                continue
            name = node.target.id
            if (
                name.startswith("_")
                or name == "model_config"
                or is_class_var(node.annotation)
            ):
                continue
            value = node.value

            # field-description
            call = value if isinstance(value, ast.Call) else None
            if call is None or call_name(call) != "Field":
                violations.append(
                    Violation(
                        p,
                        node.lineno,
                        "field-description",
                        "Not declared with Field(description=...).",
                        c,
                        name,
                    )
                )
            else:
                desc = keyword(call, "description")
                if desc is None or (
                    isinstance(desc.value, ast.Constant)
                    and not (isinstance(desc.value.value, str) and desc.value.value)
                ):
                    violations.append(
                        Violation(
                            p,
                            node.lineno,
                            "field-description",
                            "Field(...) without a description.",
                            c,
                            name,
                        )
                    )

            # discriminator-tag
            if name in tags and is_literal(node.annotation):
                has_default = call is None and value is not None
                if call is not None and call_name(call) == "Field":
                    has_default = bool(
                        call.args
                        or keyword(call, "default")
                        or keyword(call, "default_factory")
                    )
                if has_default:
                    violations.append(
                        Violation(
                            p,
                            node.lineno,
                            "discriminator-tag",
                            "Discriminator tag has a default (it must be required).",
                            c,
                            name,
                        )
                    )

    return violations


def display_path(path: Path) -> Path:
    try:
        return path.resolve().relative_to(REPO_ROOT)
    except ValueError:
        return path


def find_dto_files(root: Path) -> list[Path]:
    return sorted(root.rglob("*_dto.py"))


def parse(path: Path) -> ast.Module | None:
    """Parse a module for the index; unparsable files are reported by check_file."""
    try:
        return ast.parse(path.read_text(encoding="utf-8"))
    except (OSError, SyntaxError):
        return None


def build_index(root: Path) -> Index:
    index = Index()
    for path in [*BASE_MODULES, *find_dto_files(root)]:
        if tree := parse(path):
            index.add_module(tree)
    for path in root.rglob("*_orm.py"):
        for node in tree.body if (tree := parse(path)) else []:
            if isinstance(node, ast.ClassDef) and node.name.endswith("ORM"):
                index.orm_entities.add(node.name[: -len("ORM")])
    return index


def check_file(path: Path, index: Index) -> list[Violation]:
    violations = check_source(
        display_path(path), path.read_text(encoding="utf-8"), index
    )
    return sorted(violations, key=lambda v: v.line)


def main(argv: list[str]) -> int:
    if any(a in ("-h", "--help") for a in argv):
        print(__doc__)
        return 0

    paths = [Path(a) for a in argv]
    if not paths or any(p.name == Path(__file__).name for p in paths):
        files = find_dto_files(SRC_ROOT)
    else:
        files = [p for p in paths if p.name.endswith("_dto.py")]

    index = build_index(SRC_ROOT)
    violations = [v for f in files for v in check_file(f, index)]
    for v in violations:
        print(v)
    if violations:
        counts: dict[str, int] = {}
        for v in violations:
            counts[v.rule] = counts.get(v.rule, 0) + 1
        summary = ", ".join(f"{r}: {n}" for r, n in sorted(counts.items()))
        print(
            f"\n{len(violations)} DTO violation(s) in {len(files)} file(s) ({summary})."
        )
        print("Run 'check_dtos.py --help' for the rules.")
        return 1
    print(f"All DTO checks passed ({len(files)} file(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
