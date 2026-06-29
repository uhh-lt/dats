from typing import TypedDict

import pytest

from common.doc_type import DocType
from common.meta_type import MetaType
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataCreate
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.project.project_orm import ProjectORM


class ProjectWithMetadata(TypedDict):
    project: ProjectORM
    metadata: list[ProjectMetadataORM]


@pytest.fixture(scope="function")
def project_with_metadata(db_session, test_project, test_user) -> ProjectWithMetadata:
    """Create a project for the test user with 5 additional project metadata."""

    # Create project metadata for the project
    metadata = crud_project_meta.create_multi(
        db=db_session,
        create_dtos=[
            ProjectMetadataCreate(
                project_id=test_project.id,
                key="category",
                metatype=MetaType.STRING,
                read_only=False,
                doctype=DocType.text,
                description="The category of the document",
            ),
            ProjectMetadataCreate(
                project_id=test_project.id,
                key="date",
                metatype=MetaType.DATE,
                read_only=False,
                doctype=DocType.text,
                description="The date of the document",
            ),
            ProjectMetadataCreate(
                project_id=test_project.id,
                key="likes",
                metatype=MetaType.NUMBER,
                read_only=False,
                doctype=DocType.text,
                description="The number of likes for the document",
            ),
            ProjectMetadataCreate(
                project_id=test_project.id,
                key="topics",
                metatype=MetaType.LIST,
                read_only=False,
                doctype=DocType.text,
                description="The list of topics for the document",
            ),
            ProjectMetadataCreate(
                project_id=test_project.id,
                key="relevant",
                metatype=MetaType.BOOLEAN,
                read_only=False,
                doctype=DocType.text,
                description="The relevance of the document",
            ),
            ProjectMetadataCreate(
                project_id=test_project.id,
                key="category_ro",
                metatype=MetaType.STRING,
                read_only=True,
                doctype=DocType.text,
                description="The category of the document (read-only)",
            ),
        ],
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(test_project)
    for meta in metadata:
        db_session.refresh(meta)

    return {
        "project": test_project,
        "metadata": metadata,
    }
