import pytest
from sqlalchemy.orm import Session

from composite_keys_test_utils import TwoTenants, create_two_tenants
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
    version = crud_prompt_version.read(
        db=db_session, project_id=prompt_project["project"].id, id=version_id
    )
    version.settings = {
        key: value
        for key, value in version.settings.items()
        if key != "request_reasoning"
    }
    db_session.commit()
    assert "request_reasoning" not in version.settings
    return version_id


@pytest.fixture(scope="function")
def tenants(
    db_session: Session, test_user: UserORM, test_project: ProjectORM
) -> TwoTenants:
    """
    This fixture sets up two projects with one row of every project-owned table
    each (see `composite_keys_test_utils.TenantRows` for the full inventory):

    - `own`: the rows in the test project, among them prompt "Prompt <p>" with
      version 1 (empty text, no selections) and "Bare prompt <p>" without
      versions.
    - `foreign`: the same rows in the project "Foreign Project" (no features).

    Non-obvious derived behavior: the test user is a member of both projects, so
    an id of the other project is the only reason a request finds nothing.
    """
    return create_two_tenants(db_session, user=test_user, project=test_project)
