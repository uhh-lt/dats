from collections.abc import Generator
from typing import TypedDict

import pytest

from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from experiment_test_utils import RunUserProject, create_run_user_project
from feature_test_utils import create_project_with_features, off_by_default_feature
from job_test_utils import HeldJobs
from modules.eximport.export_enum import ExportJobType
from modules.eximport.export_job_dto import ExportJobInput
from systems.feature_system.feature_registry import Feature
from systems.job_system.job_service import JobService


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


class ProjectsWithJobs(TypedDict):
    """Two projects of the test user, each with two export jobs (ALL_SDOCS) held
    by `held_jobs`:

    - `deleted`: the test project, with `deleted_job_ids`
    - `kept`: a second project "Kept Project" without features, with
      `kept_job_ids`

    Of the two jobs of each project, the first ran to the end (it is in a
    registry of `JobService`), the second is still queued."""

    deleted: ProjectORM
    kept: ProjectORM
    deleted_job_ids: list[str]
    kept_job_ids: list[str]


def _start_export_job(project_id: int) -> str:
    payload = ExportJobInput(
        project_id=project_id,
        export_job_type=ExportJobType.ALL_SDOCS,
        specific_export_job_parameters=None,
    )
    return JobService().start_job(job_type="export", payload=payload).get_id()


@pytest.fixture(scope="function")
def projects_with_jobs(
    db_session, test_user: UserORM, test_project: ProjectORM, held_jobs: HeldJobs
) -> ProjectsWithJobs:
    """The projects described in `ProjectsWithJobs`."""
    kept = create_project_with_features(
        db_session, test_user, title="Kept Project", features=[]
    )
    ran = [_start_export_job(p.id) for p in (test_project, kept)]
    held_jobs.run("export")
    queued = [_start_export_job(p.id) for p in (test_project, kept)]
    return {
        "deleted": test_project,
        "kept": kept,
        "deleted_job_ids": [ran[0], queued[0]],
        "kept_job_ids": [ran[1], queued[1]],
    }
