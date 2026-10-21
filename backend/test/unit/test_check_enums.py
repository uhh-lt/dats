import importlib.util
import textwrap
from pathlib import Path

import pytest

LINT_SCRIPT = Path(__file__).parents[2] / "lint" / "check_enums.py"
_spec = importlib.util.spec_from_file_location("check_enums", LINT_SCRIPT)
assert _spec is not None and _spec.loader is not None
check_enums = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check_enums)

ENUMS = """
import enum
from enum import Enum, IntEnum, StrEnum


class ExampleType(str, Enum):
    A = "a"


class ExampleStatus(IntEnum):
    DONE = 1


class ExampleLayout(StrEnum):
    GRID = "grid"


class ExampleTiming(int, enum.Enum):
    DAY = 1


class StrictExampleType(ExampleType):
    pass
"""

NO_ENUMS = """
from pydantic import BaseModel


class ExampleRead(BaseModel):
    id: int
"""


# ===========================================================================
# CHECK_ENUMS RULES
# ===========================================================================


def rules(source: str, filename: str) -> set[str]:
    source = textwrap.dedent(source)
    known = check_enums.enum_names([check_enums.ast.parse(source)])
    return {v.rule for v in check_enums.check_source(Path(filename), source, known)}


@pytest.mark.parametrize(
    ("source", "filename", "expected"),
    [
        # enums in the enum module of a module
        pytest.param(ENUMS, "modules/example/example_enum.py", set(), id="module"),
        # shared enums in common
        pytest.param(ENUMS, "common/doc_type_enum.py", set(), id="common"),
        # exempt: the websocket event registry
        pytest.param(ENUMS, "common/dats_event.py", set(), id="dats-event"),
        # exempt: the search system (operators, sorting, grouping)
        pytest.param(
            ENUMS, "systems/search_system/filtering_operators.py", set(), id="search"
        ),
        # exempt: search columns
        pytest.param(
            ENUMS, "modules/search/sdoc_search/sdoc_search_columns.py", set(), id="cols"
        ),
        # no enums at all
        pytest.param(NO_ENUMS, "modules/example/example_dto.py", set(), id="no-enum"),
        # enums in a DTO file
        pytest.param(
            ENUMS, "modules/example/example_dto.py", {"enum-location"}, id="dto"
        ),
        # enums in a repo or in another system
        pytest.param(ENUMS, "repos/llm_repo.py", {"enum-location"}, id="repo"),
        pytest.param(
            ENUMS, "systems/job_system/job_dto.py", {"enum-location"}, id="system"
        ),
    ],
)
def test_check_enums_allows_enum_classes_only_in_enum_modules(
    source: str, filename: str, expected: set[str]
) -> None:
    """Enum classes are allowed in *_enum.py files and the exempt places only."""
    assert rules(source, filename) == expected


def test_check_enums_detects_all_enum_kinds_and_subclasses() -> None:
    """Enum, IntEnum, StrEnum, enum.Enum and subclasses of DATS enums all count."""
    source = textwrap.dedent(ENUMS)
    known = check_enums.enum_names([check_enums.ast.parse(source)])
    violations = check_enums.check_source(
        Path("modules/example/example_dto.py"), source, known
    )
    assert [v.cls for v in violations] == [
        "ExampleType",
        "ExampleStatus",
        "ExampleLayout",
        "ExampleTiming",
        "StrictExampleType",
    ]
    assert str(violations[0]).startswith(
        "modules/example/example_dto.py:6: [enum-location] ExampleType:"
    )


@pytest.mark.parametrize(
    ("enum_class", "expected"),
    [
        pytest.param("class ExampleType(str, Enum):", set(), id="str-enum"),
        pytest.param("class ExampleType(StrEnum):", set(), id="strenum"),
        pytest.param("class ExampleType(IntEnum):", set(), id="intenum"),
        pytest.param("class ExampleType(int, enum.Enum):", set(), id="int-enum"),
        pytest.param("class ExampleType(Enum):", {"value-type"}, id="plain-enum"),
        pytest.param("class Crud(Enum):", set(), id="crud-registry"),
    ],
)
def test_check_enums_requires_a_value_type(enum_class: str, expected: set[str]) -> None:
    """Enums need a str or int value type, except the CRUD registries."""
    source = (
        "import enum\nfrom enum import Enum, IntEnum, StrEnum\n\n\n"
        f"{enum_class}\n    A = 'a'\n"
    )
    assert rules(source, "modules/example/example_enum.py") == expected


def test_check_enums_main_reports_misplaced_enums(tmp_path: Path) -> None:
    """main() fails for a file with a misplaced enum class and passes otherwise."""
    good = tmp_path / "example_enum.py"
    good.write_text(textwrap.dedent(ENUMS))
    assert check_enums.main([str(good)]) == 0

    bad = tmp_path / "example_dto.py"
    bad.write_text(textwrap.dedent(ENUMS))
    assert check_enums.main([str(bad)]) == 1
