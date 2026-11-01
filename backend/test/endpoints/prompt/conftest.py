import pytest
from sqlalchemy.orm import Session

from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from prompt_test_utils import PromptProject, create_prompt_project


@pytest.fixture(scope="function")
def prompt_project(
    db_session: Session, test_project: ProjectORM, test_user: UserORM
) -> PromptProject:
    """The projects described in `PromptProject`."""
    return create_prompt_project(db_session, test_project, test_user)
