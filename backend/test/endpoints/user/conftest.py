from typing import TypedDict

import pytest

from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM
from experiment_test_utils import RunUserProject, create_run_user_project
from provenance_test_utils import (
    ProvenanceProjectWithCopies,
    create_provenance_copies,
    create_provenance_project,
)
from virtual_user_test_utils import VirtualUserProject, create_virtual_user_project


class ProjectWithUser(TypedDict):
    project: ProjectORM
    user: UserORM


@pytest.fixture(scope="function")
def project_with_user(db_session, test_project) -> ProjectWithUser:
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
    ps.associate_user(db=db_session, project_id=test_project.id, user_id=user.id)

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(user)

    return {
        "project": test_project,
        "user": user,
    }


@pytest.fixture(scope="function")
def provenance_project_with_copies(
    db_session, test_user, project_with_sdoc
) -> ProvenanceProjectWithCopies:
    """The project described in `ProvenanceProjectWithCopies`."""
    return create_provenance_copies(
        db_session, create_provenance_project(db_session, test_user, project_with_sdoc)
    )


@pytest.fixture(scope="function")
def virtual_user_project(
    db_session, test_user: UserORM, test_project: ProjectORM
) -> VirtualUserProject:
    """The projects described in `VirtualUserProject`."""
    return create_virtual_user_project(db_session, test_user, test_project)


@pytest.fixture(scope="function")
def run_user_project(
    db_session, test_user: UserORM, test_project: ProjectORM
) -> RunUserProject:
    """The project described in `RunUserProject`."""
    return create_run_user_project(db_session, test_user, test_project)
