import importlib.util
import textwrap
from pathlib import Path

import pytest

LINT_SCRIPT = Path(__file__).parents[2] / "lint" / "check_exceptions.py"
_spec = importlib.util.spec_from_file_location("check_exceptions", LINT_SCRIPT)
assert _spec is not None and _spec.loader is not None
check_exceptions = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check_exceptions)

EXCEPTIONS = """
from fastapi import status

from common.exception_handler import NotFoundError, exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidExampleError(Exception):
    pass


class ExampleNotFound(NotFoundError):
    pass


class StrictExampleNotFound(ExampleNotFound):
    pass
"""

NO_EXCEPTIONS = """
from pydantic import BaseModel


class ExampleRead(BaseModel):
    id: int
"""


# ===========================================================================
# CHECK_EXCEPTIONS RULES
# ===========================================================================


def rules(source: str, filename: str) -> set[str]:
    source = textwrap.dedent(source)
    known = check_exceptions.exception_names([check_exceptions.ast.parse(source)])
    return {
        v.rule for v in check_exceptions.check_source(Path(filename), source, known)
    }


@pytest.mark.parametrize(
    ("source", "filename", "expected"),
    [
        # exception classes in an exceptions module
        pytest.param(
            EXCEPTIONS, "modules/example/example_exceptions.py", set(), id="module"
        ),
        # exception classes next to a repo
        pytest.param(EXCEPTIONS, "repos/filesystem_exceptions.py", set(), id="repo"),
        # the handler infrastructure defines NotFoundError
        pytest.param(EXCEPTIONS, "common/exception_handler.py", set(), id="handler"),
        # no exception classes at all
        pytest.param(NO_EXCEPTIONS, "modules/example/example_dto.py", set(), id="dto"),
        # exception classes in a service
        pytest.param(
            EXCEPTIONS,
            "modules/example/example_service.py",
            {"exception-location"},
            id="service",
        ),
    ],
)
def test_check_exceptions_allows_exception_classes_only_in_exception_modules(
    source: str, filename: str, expected: set[str]
) -> None:
    """Exception classes are allowed in *_exceptions.py and common/exception_handler.py only."""
    assert rules(source, filename) == expected


def test_check_exceptions_resolves_exception_classes_transitively() -> None:
    """A class deriving from another DATS exception (by any name) is an exception class."""
    source = textwrap.dedent(EXCEPTIONS)
    known = check_exceptions.exception_names([check_exceptions.ast.parse(source)])
    violations = check_exceptions.check_source(
        Path("modules/example/example_job.py"), source, known
    )
    assert [v.cls for v in violations] == [
        "InvalidExampleError",
        "ExampleNotFound",
        "StrictExampleNotFound",
    ]
    assert str(violations[0]).startswith(
        "modules/example/example_job.py:8: [exception-location] InvalidExampleError:"
    )


def test_check_exceptions_main_reports_misplaced_exceptions(tmp_path: Path) -> None:
    """main() fails for a file with a misplaced exception class and passes otherwise."""
    good = tmp_path / "example_exceptions.py"
    good.write_text(textwrap.dedent(EXCEPTIONS))
    assert check_exceptions.main([str(good)]) == 0

    bad = tmp_path / "example_job.py"
    bad.write_text(textwrap.dedent(EXCEPTIONS))
    assert check_exceptions.main([str(bad)]) == 1
