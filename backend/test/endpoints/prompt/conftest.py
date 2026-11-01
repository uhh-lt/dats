import pytest
from sqlalchemy.orm import Session

from core.project.project_orm import ProjectORM
from core.prompt.prompt_version_crud import crud_prompt_version
from core.user.user_orm import UserORM
from prompt_test_utils import PromptProject, create_prompt_project


@pytest.fixture(scope="function")
def prompt_project(
    db_session: Session, test_project: ProjectORM, test_user: UserORM
) -> PromptProject:
    """The projects described in `PromptProject`."""
    return create_prompt_project(db_session, test_project, test_user)


@pytest.fixture(scope="function")
def version_without_reasoning_setting(
    db_session: Session, prompt_project: PromptProject
) -> int:
    """Version 1 of ``Span tagging`` of `prompt_project`, stored like a version
    saved before the ``request_reasoning`` setting existed: its settings JSON has
    no ``request_reasoning`` key; the other settings keep their defaults. Returns
    the id of the version."""
    version_id = prompt_project["span_prompt"].versions[0].id
    version = crud_prompt_version.read(db=db_session, id=version_id)
    version.settings = {
        key: value
        for key, value in version.settings.items()
        if key != "request_reasoning"
    }
    db_session.commit()
    assert "request_reasoning" not in version.settings
    return version_id
