from typing import TypedDict

import pytest

from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate
from core.doc.folder_enum import FolderType
from core.doc.folder_orm import FolderORM
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService


class ProjectWithFolder(TypedDict):
    project: ProjectORM
    folder: FolderORM


@pytest.fixture(scope="function")
def project_with_folder(db_session, test_project) -> ProjectWithFolder:
    """Create a project for the test user with a single folder."""

    # Create a folder in the project
    folder = crud_folder.create(
        db=db_session,
        project_id=test_project.id,
        create_dto=FolderCreate(
            name="Test Folder",
            folder_type=FolderType.NORMAL,
            parent_id=None,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(folder)

    return {"project": test_project, "folder": folder}


class ProjectWithMultipleFolders(TypedDict):
    project: ProjectORM
    folders: list[FolderORM]


@pytest.fixture(scope="function")
def project_with_multiple_folders(
    db_session, test_project
) -> ProjectWithMultipleFolders:
    """Create a project for the test user with multiple (3) folders."""

    # Create multiple folders in the project
    folders = []
    for i in range(3):
        folder = crud_folder.create(
            db=db_session,
            project_id=test_project.id,
            create_dto=FolderCreate(
                name=f"Test Folder {i}",
                folder_type=FolderType.NORMAL,
                parent_id=None,
            ),
        )
        folders.append(folder)

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(test_project)
    for folder in folders:
        db_session.refresh(folder)

    return {"project": test_project, "folders": folders}


class ProjectWithNestedFolders(TypedDict):
    project: ProjectORM
    parent: FolderORM
    child: FolderORM
    grandchild: FolderORM


@pytest.fixture(scope="function")
def project_with_nested_folders(db_session, test_project) -> ProjectWithNestedFolders:
    """Create a project with a 3-level folder chain: parent > child > grandchild.

    This fixture sets up the following project:
    - A project for the test user.
    - Folder "Parent" (NORMAL, root), "Child" (NORMAL, parent=Parent),
      "Grandchild" (NORMAL, parent=Child). All belong to the project.
    """

    parent = crud_folder.create(
        db=db_session,
        project_id=test_project.id,
        create_dto=FolderCreate(
            name="Parent",
            folder_type=FolderType.NORMAL,
            parent_id=None,
        ),
    )
    child = crud_folder.create(
        db=db_session,
        project_id=test_project.id,
        create_dto=FolderCreate(
            name="Child",
            folder_type=FolderType.NORMAL,
            parent_id=parent.id,
        ),
    )
    grandchild = crud_folder.create(
        db=db_session,
        project_id=test_project.id,
        create_dto=FolderCreate(
            name="Grandchild",
            folder_type=FolderType.NORMAL,
            parent_id=child.id,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(test_project)
    for folder in (parent, child, grandchild):
        db_session.refresh(folder)

    return {
        "project": test_project,
        "parent": parent,
        "child": child,
        "grandchild": grandchild,
    }


@pytest.fixture(scope="function")
def foreign_project_with_folder(db_session, test_user) -> ProjectWithFolder:
    """
    This fixture sets up a second project "Foreign Project" of `test_user` (so the
    user is a member of both) with the NORMAL root folder "Foreign Folder". Its
    ids belong to another project than `test_project`.
    """
    project_read = ProjectService().create_project(
        db=db_session,
        create_dto=ProjectCreate(title="Foreign Project", description="foreign"),
        creating_user_id=test_user.id,
    )
    folder = crud_folder.create(
        db=db_session,
        project_id=project_read.id,
        create_dto=FolderCreate(
            name="Foreign Folder", folder_type=FolderType.NORMAL, parent_id=None
        ),
    )
    db_session.commit()
    project = crud_project.read(db=db_session, id=project_read.id)
    return {"project": project, "folder": folder}
