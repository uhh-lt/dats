import pytest

from composite_keys_test_utils import TwoTenants, create_two_tenants


@pytest.fixture(scope="function")
def tenants(db_session, test_user, test_project) -> TwoTenants:
    """
    This fixture sets up two projects with one row of every project-owned table
    each (see `composite_keys_test_utils.TenantRows` for the full inventory):

    - `own`: the rows in the test project.
    - `foreign`: the same rows in the project "Foreign Project" (no features).

    In both, the document "doc_<p>.txt" is linked to "Tag <p>", and the test
    user's annotation document of it holds one span (text "Alpha <p>"), one
    sentence and one bounding box annotation of "Code <p>"; "Child code <p>" is
    a child of "Code <p>" without annotations.

    Non-obvious derived behavior: the test user is a member of both projects, so
    an id of the other project is the only reason a request finds nothing.
    """
    return create_two_tenants(db_session, user=test_user, project=test_project)
