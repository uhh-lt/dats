import importlib.util
import textwrap
from pathlib import Path

import pytest

LINT_SCRIPT = Path(__file__).parents[2] / "lint" / "check_services.py"
_spec = importlib.util.spec_from_file_location("check_services", LINT_SCRIPT)
assert _spec is not None and _spec.loader is not None
check_services = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check_services)

VALID_SERVICE = """
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from modules.example.example_crud import crud_example
from modules.example.example_dto import ExampleRead
from modules.example.example_exceptions import UnsupportedExampleJobError
from repos.filesystem_repo import FilesystemRepo

BATCH_SIZE = 32


class ExampleService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.fsr = FilesystemRepo()
        return super(ExampleService, cls).__new__(cls)

    def reset(self, *, db: Session, example_id: int) -> ExampleRead:
        db_obj = crud_example.read(db=db, id=example_id)
        items = set()
        items.add(db_obj.id)
        if not items:
            raise UnsupportedExampleJobError(example_id)
        return ExampleRead.model_validate(db_obj)

    def _helper(self) -> None:
        pass


def _private_helper() -> None:
    pass
"""

VALID_STRATEGY = """
from abc import ABC, abstractmethod


class TextClassificationModelService(ABC):
    def __init__(self):
        pass

    @abstractmethod
    def train(self) -> None: ...
"""

VALID_PER_JOB = """
class PerspectivesService:
    def __init__(self, job):
        self.job = job
"""

VALID_SYSTEM = """
from common.dats_event import DATSEventBase
from common.singleton_meta import SingletonMeta


class WebsocketService(metaclass=SingletonMeta):
    def __init__(self):
        self.connections = {}

    def broadcast(self, event: DATSEventBase) -> None:
        self.emit_to_all(event)
"""


# ===========================================================================
# CHECK_SERVICES RULES
# ===========================================================================


def run(source: str, filename: str = "modules/example/example_service.py") -> list:
    return check_services.check_source(Path(filename), textwrap.dedent(source))


def rules(
    source: str, filename: str = "modules/example/example_service.py"
) -> set[str]:
    return {v.rule for v in run(source, filename)}


# --- A. valid services --------------------------------------------------------


@pytest.mark.parametrize(
    ("source", "filename"),
    [
        # singleton service with dependencies, a domain exception and private helpers
        pytest.param(VALID_SERVICE, "modules/example/example_service.py", id="service"),
        # strategy hierarchy: ABC with __init__, no SingletonMeta
        pytest.param(
            VALID_STRATEGY,
            "modules/classifier/models/text_class_model_service.py",
            id="strategy",
        ),
        # per-job service: plain class with __init__
        pytest.param(
            VALID_PER_JOB, "modules/perspectives/perspectives_service.py", id="per-job"
        ),
        # systems singleton: __init__ state, the websocket system may use events
        pytest.param(
            VALID_SYSTEM,
            "systems/websocket_system/websocket_service.py",
            id="systems",
        ),
    ],
)
def test_check_services_accepts_valid_service_and_variations(
    source: str, filename: str
) -> None:
    """A service following all conventions (or a documented variation) yields no violations."""
    assert run(source, filename) == []


# --- B. one failing example per rule ------------------------------------------
# Each case replaces one snippet of VALID_SERVICE and must trigger exactly its rule.


@pytest.mark.parametrize(
    ("rule", "old", "new"),
    [
        # importing an endpoint module
        pytest.param(
            "no-endpoint-import",
            "from repos.filesystem_repo import FilesystemRepo\n",
            "from repos.filesystem_repo import FilesystemRepo\n"
            "from modules.example.example_endpoint import router\n",
            id="endpoint-import",
        ),
        # class not named after the file
        pytest.param(
            "service-class",
            "class ExampleService(",
            "class ExampleManager(",
            id="service-class-name",
        ),
        # a second service class in the same file
        pytest.param(
            "service-class",
            "BATCH_SIZE = 32\n",
            "BATCH_SIZE = 32\n\n\nclass OtherService:\n    pass\n",
            id="service-class-two",
        ),
        # service without SingletonMeta
        pytest.param(
            "service-class",
            "class ExampleService(metaclass=SingletonMeta):",
            "class ExampleService:",
            id="service-class-metaclass",
        ),
        # __new__ without *args, **kwargs
        pytest.param(
            "new-signature",
            "def __new__(cls, *args, **kwargs):",
            "def __new__(cls):",
            id="new-signature-args",
        ),
        # __new__ returning something else
        pytest.param(
            "new-signature",
            "return super(ExampleService, cls).__new__(cls)",
            "return super().__new__(cls)",
            id="new-signature-return",
        ),
        # state in __init__
        pytest.param(
            "new-signature",
            "    def _helper(self) -> None:\n",
            "    def __init__(self):\n        self.cache = {}\n\n    def _helper(self) -> None:\n",
            id="new-signature-init",
        ),
        # public module-level function
        pytest.param(
            "module-function",
            "def _private_helper() -> None:",
            "def compute_stats() -> None:",
            id="module-function",
        ),
        # HTTPException
        pytest.param(
            "no-http",
            "raise UnsupportedExampleJobError(example_id)",
            "raise HTTPException(status_code=400, detail='bad')",
            id="http-exception",
        ),
        # fastapi status codes
        pytest.param(
            "no-http",
            "from sqlalchemy.orm import Session\n",
            "from fastapi import status\nfrom sqlalchemy.orm import Session\n",
            id="http-status",
        ),
        # bare Exception
        pytest.param(
            "no-bare-exception",
            "raise UnsupportedExampleJobError(example_id)",
            "raise Exception('failed')",
            id="bare-exception",
        ),
        # commit on the session
        pytest.param(
            "no-commit", "items.add(db_obj.id)", "db.commit()", id="no-commit-commit"
        ),
        # rollback on the session
        pytest.param(
            "no-commit",
            "items.add(db_obj.id)",
            "db.rollback()",
            id="no-commit-rollback",
        ),
        # add on the session (items.add on a set is fine)
        pytest.param(
            "no-commit", "items.add(db_obj.id)", "db.add(db_obj)", id="no-commit-add"
        ),
        # DATSEvent import
        pytest.param(
            "no-events",
            "from sqlalchemy.orm import Session\n",
            "from sqlalchemy.orm import Session\n\nfrom common.dats_event import DATSEvent\n",
            id="events-import",
        ),
        # emitting an event
        pytest.param(
            "no-events",
            "items.add(db_obj.id)",
            "self.ws.emit_to_project(db_obj)",
            id="events-emit",
        ),
        # exception class in the service file
        pytest.param(
            "no-exception-class",
            "BATCH_SIZE = 32\n",
            "BATCH_SIZE = 32\n\n\nclass ExampleError(Exception):\n    pass\n",
            id="exception-class",
        ),
    ],
)
def test_check_services_reports_exactly_the_violated_rule(
    rule: str, old: str, new: str
) -> None:
    """Breaking one convention of a valid service reports that rule and no other."""
    assert old in VALID_SERVICE
    source = VALID_SERVICE.replace(old, new, 1)
    assert rules(source) == {rule}


# --- C. variations, output and CLI ---------------------------------------------


def test_check_services_variations_still_apply_the_content_rules() -> None:
    """Variations only skip the shape rules: HTTP, commits and exception classes are still reported."""
    source = VALID_PER_JOB + "\n\nclass PerspectivesError(Exception):\n    pass\n"
    assert rules(source, "modules/perspectives/perspectives_service.py") == {
        "no-exception-class"
    }
    source = VALID_STRATEGY.replace("pass", "db.commit()")
    assert rules(source, "modules/classifier/models/text_class_model_service.py") == {
        "no-commit"
    }


def test_check_services_violation_names_file_class_method_and_rule() -> None:
    """The printed violation contains file, line, rule, class and method."""
    source = VALID_SERVICE.replace("items.add(db_obj.id)", "db.commit()")
    (violation,) = run(source)
    assert str(violation).startswith("modules/example/example_service.py:")
    assert "[no-commit] ExampleService.reset:" in str(violation)


def test_check_services_main_checks_only_service_files(tmp_path: Path) -> None:
    """Files passed on the command line that are no service files are ignored; service files are checked."""
    other = tmp_path / "example_crud.py"
    other.write_text("def compute(): pass\n")
    assert check_services.main([str(other)]) == 0

    bad = tmp_path / "example_service.py"
    bad.write_text(textwrap.dedent(VALID_SERVICE).replace("_private_helper", "helper"))
    assert check_services.main([str(bad)]) == 1
