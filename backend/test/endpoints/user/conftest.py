from typing import TypedDict

import pytest

from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM


class ProjectWithUser(TypedDict):
    project: ProjectORM
    user: UserORM


@pytest.fixture(scope="function")
def project_with_user(db_session, test_project, test_user) -> ProjectWithUser:
    """Create a project for the test user with an additional user."""

    # Create an additional user
    user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            email="tim.fischer@dats.science",
            first_name="Tim",
            last_name="Fischer",
            password="timfischer123",
        ),
    )

    # Add the user to the project
    ps = ProjectService()
    ps.associate_user(db=db_session, proj_id=test_project.id, user_id=user.id)

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(user)

    return {
        "project": test_project,
        "user": user,
    }
