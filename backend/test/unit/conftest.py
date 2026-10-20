# Unit tests do not need the dev stack: override the autouse fixtures of
# test/conftest.py (workers, data stores) with no-ops.
import pytest


@pytest.fixture(scope="session", autouse=True)
def start_workers() -> None:
    return None


@pytest.fixture(scope="session", autouse=True)
def start_dats() -> None:
    return None


@pytest.fixture(scope="function", autouse=True)
def clean_data_stores() -> None:
    return None
