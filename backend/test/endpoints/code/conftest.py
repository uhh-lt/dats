from typing import TypedDict

import pytest

from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.project.project_orm import ProjectORM


class ProjectWithCode(TypedDict):
    project: ProjectORM
    code: CodeORM


@pytest.fixture(scope="function")
def project_with_code(db_session, test_project) -> ProjectWithCode:
    """Create a project for the test user with a single code."""

    # Create a code in the project
    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Test Code",
            color="Red",
            description="Test code for retrieval",
            parent_id=None,
            enabled=True,
            project_id=test_project.id,
            is_system=False,
        ),
    )
    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(code)

    return {"project": test_project, "code": code}


class ProjectWithParentAndChildCode(TypedDict):
    project: ProjectORM
    parent_code: CodeORM
    code: CodeORM


@pytest.fixture(scope="function")
def project_with_parent_and_child_code(
    db_session, test_project
) -> ProjectWithParentAndChildCode:
    """Create a project with a parent code and a child code."""

    # Create parent code
    parent_code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Parent Code",
            color="Blue",
            description="Parent code for testing",
            parent_id=None,
            enabled=True,
            project_id=test_project.id,
            is_system=False,
        ),
    )
    db_session.flush()

    # Create child code
    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Child Code",
            color="Green",
            description="Child code for testing",
            parent_id=parent_code.id,
            enabled=True,
            project_id=test_project.id,
            is_system=False,
        ),
    )
    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(parent_code)
    db_session.refresh(code)

    return {"project": test_project, "parent_code": parent_code, "code": code}
