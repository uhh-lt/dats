import pytest

from composite_keys_test_utils import TwoTenants, create_two_tenants


@pytest.fixture(scope="function")
def two_tenants(db_session, test_user, test_project) -> TwoTenants:
    """
    This fixture sets up two projects with one row of every project-owned table
    each (see `composite_keys_test_utils.TenantRows` for the full inventory):

    - `own`: the rows in the test project.
    - `foreign`: the same rows in the project "Foreign Project" (no features).

    The test user is a member of both projects and annotated in both: the
    annotation document of the test user for "doc_<p>.txt" holds the span
    annotation of "Code <p>" and the span group "Group <p>", which contains that
    span annotation. "bare_<p>.txt" has no annotation document.

    Non-obvious derived behavior: because the user is a member of both projects,
    a request may only fail because an id belongs to the other project, never
    because of the membership.
    """
    return create_two_tenants(db_session, user=test_user, project=test_project)
