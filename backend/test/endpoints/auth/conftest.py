import pytest

from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from virtual_user_test_utils import VirtualUserProject, create_virtual_user_project


@pytest.fixture(scope="function")
def virtual_user_project(
    db_session, test_user: UserORM, test_project: ProjectORM
) -> VirtualUserProject:
    """The projects described in `VirtualUserProject`."""
    return create_virtual_user_project(db_session, test_user, test_project)
