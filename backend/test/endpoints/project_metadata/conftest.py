from typing import TypedDict

import pytest

from common.doc_type_enum import DocType
from common.meta_type_enum import MetaType
from composite_keys_test_utils import TwoTenants, create_two_tenants
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataCreate
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.project.project_orm import ProjectORM


class ProjectWithMetadata(TypedDict):
    project: ProjectORM
    metadata: list[ProjectMetadataORM]


@pytest.fixture(scope="function")
def project_with_metadata(db_session, test_project, test_user) -> ProjectWithMetadata:
    """Create a project for the test user with 6 additional project metadata; the
    last one, "category_ro", is read-only (updates and deletes are rejected)."""

    # Create project metadata for the project
    metadata = crud_project_meta.create_multi(
        db=db_session,
        project_id=test_project.id,
        create_dtos=[
            ProjectMetadataCreate(
                key="category",
                metatype=MetaType.STRING,
                read_only=False,
                doctype=DocType.text,
                description="The category of the document",
            ),
            ProjectMetadataCreate(
                key="date",
                metatype=MetaType.DATE,
                read_only=False,
                doctype=DocType.text,
                description="The date of the document",
            ),
            ProjectMetadataCreate(
                key="likes",
                metatype=MetaType.NUMBER,
                read_only=False,
                doctype=DocType.text,
                description="The number of likes for the document",
            ),
            ProjectMetadataCreate(
                key="topics",
                metatype=MetaType.LIST,
                read_only=False,
                doctype=DocType.text,
                description="The list of topics for the document",
            ),
            ProjectMetadataCreate(
                key="relevant",
                metatype=MetaType.BOOLEAN,
                read_only=False,
                doctype=DocType.text,
                description="The relevance of the document",
            ),
            ProjectMetadataCreate(
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


@pytest.fixture(scope="function")
def tenants(db_session, test_user, test_project) -> TwoTenants:
    """
    This fixture sets up two projects with one row of every project-owned table
    each (see `composite_keys_test_utils.TenantRows` for the full inventory):
    `own` in the test project, `foreign` in "Foreign Project". Each has the
    project metadata "key_<p>" (string, text documents, description "").

    Non-obvious derived behavior: the test user is a member of both projects, so
    an id of the other project is the only reason a request fails.
    """
    return create_two_tenants(db_session, user=test_user, project=test_project)
