from typing import Generator
from unittest.mock import patch

import pytest

from common.job_type_enum import JobType
from core.user.user_orm import UserORM
from feature_test_utils import (
    FeatureProject,
    PartlyProject,
    create_feature_project,
    create_partly_project,
)
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService


@pytest.fixture(scope="function")
def feature_project(db_session, test_user: UserORM) -> FeatureProject:
    """The project described in `FeatureProject`."""
    return create_feature_project(db_session, test_user)


@pytest.fixture(scope="function")
def partly_project(db_session, test_user: UserORM) -> PartlyProject:
    """The project described in `PartlyProject`."""
    return create_partly_project(db_session, test_user)


@pytest.fixture(scope="function")
def started_jobs() -> Generator[list[tuple[JobType, JobInputBase]], None, None]:
    """Captures the jobs the API starts instead of enqueueing them, so a feature
    activation does not run the preprocessing."""
    started: list[tuple[JobType, JobInputBase]] = []

    def _start_job(job_type: JobType, payload: JobInputBase, priority=None) -> None:
        started.append((job_type, payload))

    with patch.object(JobService, "start_job", side_effect=_start_job):
        yield started
