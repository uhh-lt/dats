from typing import TypedDict

import pytest

from common.doc_type_enum import DocType
from common.meta_type_enum import MetaType
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataCreate
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.user.user_orm import UserORM


class MissingValueNamedCodes(TypedDict):
    project: ProjectORM
    target_project: ProjectORM
    na_code: CodeORM
    null_code: CodeORM


class EmptyDescriptionProjects(TypedDict):
    project: ProjectORM
    target_project: ProjectORM


def _create_target_project(db_session, test_user: UserORM) -> ProjectORM:
    return crud_project.read(
        db=db_session,
        id=ProjectService()
        .create_project(
            db=db_session,
            create_dto=ProjectCreate(
                title="Import Target", description="The project data is imported to"
            ),
            creating_user_id=test_user.id,
        )
        .id,
    )


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
    target_project = _create_target_project(db_session, test_user)
    db_session.commit()
    db_session.refresh(test_project)

    return {
        "project": test_project,
        "target_project": target_project,
        "na_code": na_code,
        "null_code": null_code,
    }


@pytest.fixture(scope="function")
def empty_description_projects(
    db_session, test_user, test_project
) -> EmptyDescriptionProjects:
    """
    This fixture sets up the following projects:

    - Project "Simple Test Project" (`project`) of the test user, with its system
      codes and project metadata, plus three objects with an empty description:
      - the code "Undescribed code" (color "red"), a top-level code,
      - the tag "Undescribed tag" (color "blue"), a top-level tag,
      - the text metadata field "undescribed" of text documents.
    - Project "Import Target" (`target_project`) of the test user, with only its
      system codes and project metadata.

    Non-obvious derived behavior:

    - The export writes an empty description as an empty cell, which the import
      reads as a missing value (None).
    """
    crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Undescribed code",
            color="red",
            description="",
            parent_id=None,
            enabled=True,
            project_id=test_project.id,
            is_system=False,
        ),
    )
    crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="Undescribed tag",
            color="blue",
            description="",
            project_id=test_project.id,
        ),
    )
    crud_project_meta.create(
        db=db_session,
        create_dto=ProjectMetadataCreate(
            key="undescribed",
            metatype=MetaType.STRING,
            doctype=DocType.text,
            description="",
            project_id=test_project.id,
        ),
    )
    target_project = _create_target_project(db_session, test_user)
    db_session.commit()
    db_session.refresh(test_project)

    return {"project": test_project, "target_project": target_project}
