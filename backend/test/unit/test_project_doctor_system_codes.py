"""The system code check of the project doctor (tools/project_doctor), run on
fixed code rows instead of a database."""

import importlib.util
import sys
from collections import namedtuple
from pathlib import Path
from types import ModuleType, SimpleNamespace

from bootstrap import register_jobs
from core.code.system_codes import parent_names
from systems.artefact_system.artefact_registry import artefact_registry

register_jobs()

DOCTOR = Path(__file__).resolve().parents[3] / "tools" / "project_doctor"


def _doctor_portability() -> ModuleType:
    """The doctor's portability checks; its sibling modules are imported by
    plain name, so the doctor folder goes on the path."""
    if str(DOCTOR) not in sys.path:
        sys.path.insert(0, str(DOCTOR))
    spec = importlib.util.spec_from_file_location(
        "doctor_portability", DOCTOR / "doctor_portability.py"
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CodeRow = namedtuple("CodeRow", "id name parent_id is_system")


def _issues(rows: list[CodeRow]) -> dict[str, object]:
    """The issues of the check by the last part of their key."""
    checker = _doctor_portability().PortabilityChecker(
        conn=None,  # type: ignore[arg-type]
        stores=SimpleNamespace(
            system_code_parents=parent_names(artefact_registry.system_codes())
        ),  # type: ignore[arg-type]
    )
    checker._rows = lambda sql, **params: rows  # type: ignore[method-assign]
    return {
        issue.key.rsplit(":", 1)[1]: issue for issue in checker._check_system_codes(1)
    }


def test_a_user_tree_below_a_user_parent_is_reported_without_a_fix():
    """The user tree `ANIMAL` > `DOG`: `ANIMAL` lies below the system root,
    which the project has, so heal renames it; `DOG` lies below the user code
    `ANIMAL`, so it is only reported, without a fix."""
    issues = _issues(
        [
            CodeRow(1, "SYSTEM_CODE", None, True),
            CodeRow(2, "ANIMAL", None, False),
            CodeRow(3, "DOG", 2, False),
        ]
    )

    assert set(issues) == {"names", "blocking"}
    assert issues["names"].fix.values == {2: "ANIMAL (custom)"}  # type: ignore[attr-defined]
    assert issues["blocking"].fix is None  # type: ignore[attr-defined]
    assert "'DOG'" in issues["blocking"].message  # type: ignore[attr-defined]


def test_a_user_code_below_its_declared_system_parent_is_renamed():
    """A user code `PERSON` below the system code `NAMED_ENTITY` blocks the set
    up of the entity tree, so heal renames it."""
    issues = _issues(
        [
            CodeRow(1, "SYSTEM_CODE", None, True),
            CodeRow(2, "NAMED_ENTITY", 1, True),
            CodeRow(3, "PERSON", 2, False),
        ]
    )

    assert set(issues) == {"names"}
    assert issues["names"].fix.values == {3: "PERSON (custom)"}  # type: ignore[attr-defined]
