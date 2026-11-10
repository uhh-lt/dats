import pytest

from core.user.user_orm import UserORM
from feature_test_utils import FeatureProject, create_feature_project


@pytest.fixture(scope="function")
def feature_project(db_session, test_user: UserORM) -> FeatureProject:
    """The project described in `FeatureProject`."""
    return create_feature_project(db_session, test_user)
