# Unit tests do not need the dev stack: override the autouse fixtures of
# test/conftest.py (workers, data stores) with no-ops.
from collections.abc import Generator

import pytest

from feature_test_utils import off_by_default_feature
from systems.feature_system.feature_registry import Feature


@pytest.fixture(scope="session", autouse=True)
def start_workers() -> None:
    return None


@pytest.fixture(scope="session", autouse=True)
def start_dats() -> None:
    return None


@pytest.fixture(scope="function", autouse=True)
def clean_data_stores() -> None:
    return None


@pytest.fixture(scope="function")
def off_by_default() -> Generator[Feature, None, None]:
    """The test feature of `off_by_default_feature`, registered for the test."""
    with off_by_default_feature() as feature:
        yield feature
