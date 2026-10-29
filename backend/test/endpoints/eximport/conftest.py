from typing import TypedDict

import pytest

from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService


class MissingValueNamedCodes(TypedDict):
    project: ProjectORM
    target_project: ProjectORM
    na_code: CodeORM
    null_code: CodeORM


@pytest.fixture(scope="function")
def missing_value_named_codes(
    db_session, test_user, test_project
) -> MissingValueNamedCodes:
    """
    This fixture sets up the following projects:

    - Project "Simple Test Project" (`project`) of the test user, with its system
      codes and two codes named like missing values in pandas:
      - "NA" (`na_code`, color "red", description "N/A"), a top-level code,
      - "null" (`null_code`, color "blue", description "null"), a child of "NA".
    - Project "Import Target" (`target_project`) of the test user, with only its
      system codes.

    Non-obvious derived behavior:

    - pandas reads the cells "NA", "N/A" and "null" as missing values by default.
    - The exported parent of "NA" is an empty cell, which must stay missing (None).
    """
    na_code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="NA",
            color="red",
            description="N/A",
            parent_id=None,
            enabled=True,
            project_id=test_project.id,
            is_system=False,
        ),
    )
    null_code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="null",
            color="blue",
            description="null",
            parent_id=na_code.id,
            enabled=True,
            project_id=test_project.id,
            is_system=False,
        ),
    )
    target_project = crud_project.read(
        db=db_session,
        id=ProjectService()
        .create_project(
            db=db_session,
            create_dto=ProjectCreate(
                title="Import Target", description="The project codes are imported to"
            ),
            creating_user_id=test_user.id,
        )
        .id,
    )
    db_session.commit()
    db_session.refresh(test_project)

    return {
        "project": test_project,
        "target_project": target_project,
        "na_code": na_code,
        "null_code": null_code,
    }
