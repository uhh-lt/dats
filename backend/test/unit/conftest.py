# Unit tests do not need the dev stack: override the session/function autouse
# fixtures of test/conftest.py (workers, postgres, weaviate, users) with no-ops.
import pytest


@pytest.fixture(scope="session", autouse=True)
def start_workers() -> None:
    return None


@pytest.fixture(scope="session", autouse=True)
def init_postgres() -> None:
    return None


@pytest.fixture(scope="function", autouse=True)
def setup_repos() -> None:
    return None


@pytest.fixture(scope="function", autouse=True)
def setup_weaviate_collections() -> None:
    return None


@pytest.fixture(scope="function", autouse=True)
def setup_users() -> None:
    return None
