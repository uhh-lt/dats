from collections.abc import Generator

import pytest

from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from experiment_test_utils import RunUserProject, create_run_user_project
from feature_test_utils import off_by_default_feature
from systems.feature_system.feature_registry import Feature


@pytest.fixture(scope="function")
def run_user_project(
    db_session, test_user: UserORM, test_project: ProjectORM
) -> RunUserProject:
    """The project described in `RunUserProject`."""
    return create_run_user_project(db_session, test_user, test_project)


@pytest.fixture(scope="function")
def off_by_default() -> Generator[Feature, None, None]:
    """The test feature of `off_by_default_feature`, registered for the test."""
    with off_by_default_feature() as feature:
        yield feature
