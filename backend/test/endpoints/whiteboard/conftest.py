from typing import TypedDict

import pytest

from composite_keys_test_utils import TwoTenants, create_two_tenants
from core.project.project_orm import ProjectORM
from modules.whiteboard.whiteboard_crud import crud_whiteboard
from modules.whiteboard.whiteboard_dto import WhiteboardCreateIntern
from modules.whiteboard.whiteboard_orm import WhiteboardORM


class ProjectWithWhiteboard(TypedDict):
    project: ProjectORM
    whiteboard: WhiteboardORM


@pytest.fixture(scope="function")
def project_with_whiteboard(db_session, test_project) -> ProjectWithWhiteboard:
    """This fixture sets up the following project:

    - project: the test project of the test user
    - whiteboard: "Test Whiteboard" in the project, with the default (empty) content
    """
    whiteboard = crud_whiteboard.create(
        db=db_session,
        project_id=test_project.id,
        create_dto=WhiteboardCreateIntern(title="Test Whiteboard"),
    )
    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(whiteboard)

    return {"project": test_project, "whiteboard": whiteboard}


@pytest.fixture(scope="function")
def tenants(db_session, test_user, test_project) -> TwoTenants:
    """
    This fixture sets up two projects with one row of every project-owned table
    each (see `composite_keys_test_utils.TenantRows` for the full inventory):

    - `own`: the rows in the test project, among them the empty whiteboard
      "Whiteboard <p>".
    - `foreign`: the same rows in the project "Foreign Project" (no features).

    Non-obvious derived behavior: the test user is a member of both projects, so
    an id of the other project is the only reason a request finds nothing.
    """
    return create_two_tenants(db_session, user=test_user, project=test_project)
