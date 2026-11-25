import pytest

from composite_keys_test_utils import TwoTenants, create_two_tenants
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
