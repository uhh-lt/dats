from typing import TypedDict

import pytest

from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from core.doc.folder_orm import FolderORM
from core.project.project_orm import ProjectORM


class ProjectWithFolder(TypedDict):
    project: ProjectORM
    folder: FolderORM


@pytest.fixture(scope="function")
def project_with_folder(db_session, test_project) -> ProjectWithFolder:
    """Create a project for the test user with a single folder."""

    # Create a folder in the project
    folder = crud_folder.create(
        db=db_session,
        create_dto=FolderCreate(
            name="Test Folder",
            folder_type=FolderType.NORMAL,
            parent_id=None,
            project_id=test_project.id,
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
            create_dto=FolderCreate(
                name=f"Test Folder {i}",
                folder_type=FolderType.NORMAL,
                parent_id=None,
                project_id=test_project.id,
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
        create_dto=FolderCreate(
            name="Parent",
            folder_type=FolderType.NORMAL,
            parent_id=None,
            project_id=test_project.id,
        ),
    )
    child = crud_folder.create(
        db=db_session,
        create_dto=FolderCreate(
            name="Child",
            folder_type=FolderType.NORMAL,
            parent_id=parent.id,
            project_id=test_project.id,
        ),
    )
    grandchild = crud_folder.create(
        db=db_session,
        create_dto=FolderCreate(
            name="Grandchild",
            folder_type=FolderType.NORMAL,
            parent_id=child.id,
            project_id=test_project.id,
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
