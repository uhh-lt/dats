from typing import TypedDict

import pytest

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
        create_dto=WhiteboardCreateIntern(
            title="Test Whiteboard", project_id=test_project.id
        ),
    )
    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(whiteboard)

    return {"project": test_project, "whiteboard": whiteboard}
