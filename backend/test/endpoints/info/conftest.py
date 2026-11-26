from collections.abc import Generator

import pytest

from feature_test_utils import off_by_default_feature
from systems.feature_system.feature_registry import Feature


@pytest.fixture(scope="function")
def off_by_default() -> Generator[Feature, None, None]:
    """The test feature of `off_by_default_feature`, registered for the test."""
    with off_by_default_feature() as feature:
        yield feature
