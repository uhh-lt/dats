import pytest

from composite_keys_test_utils import TwoTenants, create_two_tenants
from core.user.user_orm import UserORM
from feature_test_utils import FeaturelessProject, create_featureless_project


@pytest.fixture(scope="function")
def featureless_project(db_session, test_user: UserORM) -> FeaturelessProject:
    """
    This fixture sets up the following project, in addition to `test_project`
    (which enables the features that are on by default):

    - project: "Featureless Project" of `test_user`, without any enabled feature
    - sdoc: text document "text_done.txt" in it, with the steps of a project
      without features finished
    """
    return create_featureless_project(db_session, test_user)


@pytest.fixture(scope="function")
def tenants(db_session, test_user, test_project) -> TwoTenants:
    """
    This fixture sets up two projects with one row of every project-owned table
    each (see `composite_keys_test_utils.TenantRows` for the full inventory):

    - `own`: the rows in the test project (word frequency enabled).
    - `foreign`: the same rows in the project "Foreign Project" (no features).

    In both, the document "doc_<p>.txt" counts the word "word" once.
    """
    return create_two_tenants(db_session, user=test_user, project=test_project)
