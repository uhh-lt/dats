import pytest

from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from experiment_test_utils import RunUserProject, create_run_user_project
from provenance_test_utils import (
    ProvenanceProjectWithCopies,
    create_provenance_copies,
    create_provenance_project,
)


@pytest.fixture(scope="function")
def provenance_project_with_copies(
    db_session, test_user, project_with_sdoc
) -> ProvenanceProjectWithCopies:
    """The project described in `ProvenanceProjectWithCopies`."""
    return create_provenance_copies(
        db_session, create_provenance_project(db_session, test_user, project_with_sdoc)
    )


@pytest.fixture(scope="function")
def run_user_project(
    db_session, test_user: UserORM, test_project: ProjectORM
) -> RunUserProject:
    """The project described in `RunUserProject`."""
    return create_run_user_project(db_session, test_user, test_project)
