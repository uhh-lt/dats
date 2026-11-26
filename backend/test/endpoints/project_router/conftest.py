from collections.abc import Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from composite_keys_test_utils import (
    TwinProjects,
    TwoTenants,
    create_twin_projects,
    create_two_tenants,
)
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from dats_test_utils import create_user_client
from job_test_utils import store_job
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService


@pytest.fixture(scope="function")
def tenants(db_session, test_user, test_project) -> TwoTenants:
    """
    This fixture sets up two projects with one row of every project-owned table
    each (see `composite_keys_test_utils.TenantRows` for the full inventory):

    - `own`: the rows in the test project.
    - `foreign`: the same rows in the project "Foreign Project" (no features).

    The test user is a member of both projects and annotated in both: the
    annotation document of the test user for "doc_<p>.txt" holds one span, one
    sentence and one bounding box annotation of "Code <p>" and the span group
    "Group <p>".

    Non-obvious derived behavior: because the user is a member of both projects,
    a request may only fail because an id belongs to the other project, never
    because of the membership.
    """
    return create_two_tenants(db_session, user=test_user, project=test_project)


# per tenant ("own", "foreign"): the id of a job of every job type by job type
TenantJobs = dict[str, dict[str, str]]


@pytest.fixture(scope="function")
def tenant_jobs(tenants: TwoTenants) -> TenantJobs:
    """
    This fixture stores one job of every registered job type in each project of
    `tenants`, without enqueueing it, so no worker runs it: `own` holds the job
    ids of the test project, `foreign` those of "Foreign Project", by job type.

    Non-obvious derived behavior: the jobs carry a bare `JobInputBase` as input,
    so only the routes that read the job without its input succeed with them;
    the routes of a job of another project fail before they read the input.
    """
    return {
        tenant: {
            job_type: store_job(
                job_type, JobInputBase(project_id=tenants[tenant]["project"].id)
            )
            for job_type in JobService().job_registry
        }
        for tenant in ("own", "foreign")
    }


@pytest.fixture(scope="function")
def non_member_client(app_client, db_session) -> Generator[TestClient, Any, None]:
    """A client authenticated as "nonmember@dats.org", a user who is not a
    member of the test project."""
    user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            first_name="Non",
            last_name="Member",
            email="nonmember@dats.org",
            password="NonPassword123",
        ),
    )
    db_session.commit()
    client = create_user_client(app_client, user)
    yield client
    client.close()


@pytest.fixture(scope="function")
def twins(db_session, test_user, test_project) -> TwinProjects:
    """
    This fixture sets up two projects that hold the same ids (see
    `composite_keys_test_utils.TwinProjects`):

    - `project`: the test project with one row of every project-owned table
      (`rows`, see `composite_keys_test_utils.TenantRows`).
    - `twin`: "Twin Project" with the same features and a copy of every row of the
      test project with the same id.

    Non-obvious derived behavior: only the SQL rows are copied, so a read of
    Elasticsearch, Weaviate or files finds nothing in either project.
    """
    return create_twin_projects(db_session, user=test_user, project=test_project)
