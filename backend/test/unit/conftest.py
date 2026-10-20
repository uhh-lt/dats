# Unit tests do not need the dev stack: override the autouse fixtures of
# test/conftest.py (workers, data stores) with no-ops.
import pytest


@pytest.fixture(scope="session", autouse=True)
def start_workers() -> None:
    return None


@pytest.fixture(scope="session", autouse=True)
def prepare_data_stores() -> None:
    return None


@pytest.fixture(scope="function", autouse=True)
def setup_repos() -> None:
    return None
