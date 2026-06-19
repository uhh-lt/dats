from typing import TypedDict

import pytest

from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from core.doc.folder_orm import FolderORM
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService


class ProjectWithFolder(TypedDict):
    project: ProjectORM
    folder: FolderORM


class ProjectWithMultipleFolders(TypedDict):
    project: ProjectORM
    folders: list[FolderORM]


@pytest.fixture(scope="function")
def project_with_folder(db_session, test_user) -> ProjectWithFolder:
    """Create a project for the test user with a single folder."""

    project_dto = ProjectCreate(
        title="Test Project",
        description="A project for testing folders",
    )

    # Use ProjectService to create the project with all infrastructure
    ps = ProjectService()
    project = ps.create_project(
        db=db_session,
        create_dto=project_dto,
        creating_user_id=test_user.id,
    )

    # Create a folder in the project
    folder = crud_folder.create(
        db=db_session,
        create_dto=FolderCreate(
            name="Test Folder",
            folder_type=FolderType.NORMAL,
            parent_id=None,
            project_id=project.id,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(folder)

    return {"project": project, "folder": folder}


@pytest.fixture(scope="function")
def project_with_multiple_folders(db_session, test_user) -> ProjectWithMultipleFolders:
    """Create a project for the test user with multiple folders."""

    project_dto = ProjectCreate(
        title="Test Project",
        description="A project for testing folders",
    )

    # Use ProjectService to create the project with all infrastructure
    ps = ProjectService()
    project = ps.create_project(
        db=db_session,
        create_dto=project_dto,
        creating_user_id=test_user.id,
    )

    # Create multiple folders in the project
    folders = []
    for i in range(3):
        folder = crud_folder.create(
            db=db_session,
            create_dto=FolderCreate(
                name=f"Test Folder {i}",
                folder_type=FolderType.NORMAL,
                parent_id=None,
                project_id=project.id,
            ),
        )
        folders.append(folder)

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    for folder in folders:
        db_session.refresh(folder)

    return {"project": project, "folders": folders}
