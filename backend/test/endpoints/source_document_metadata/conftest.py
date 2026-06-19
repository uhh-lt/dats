from typing import TypedDict

import pytest

from common.doc_type import DocType
from common.meta_type import MetaType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataCreate
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import SourceDocumentMetadataCreate
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from core.project.project_orm import ProjectORM


class ProjectWithSourceDocument(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM


@pytest.fixture(scope="function")
def project_with_source_document(test_project, db_session) -> ProjectWithSourceDocument:
    """Create a project for the test user with a source document and project metadata."""

    sdoc = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="Test Document",
            name="Document",
            doctype=DocType.text,
            project_id=test_project.id,
            folder_id=None,
        ),
    )

    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(sdoc)

    return {
        "project": test_project,
        "source_document": sdoc,
    }


class ProjectWithSourceDocumentAndProjMeta(ProjectWithSourceDocument):
    project_metadata: ProjectMetadataORM


@pytest.fixture(scope="function")
def project_with_sdoc_and_projmeta(
    db_session, project_with_source_document, test_user
) -> ProjectWithSourceDocumentAndProjMeta:
    """Create a project for the test user with a source document and new project metadata."""
    project = project_with_source_document["project"]
    sdoc = project_with_source_document["source_document"]

    # Create project metadata for the project
    new_project_metadata = crud_project_meta.create(
        db=db_session,
        create_dto=ProjectMetadataCreate(
            project_id=project.id,
            key="text_metadata",
            description="Test project metadata",
            metatype=MetaType.STRING,
            doctype=DocType.text,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(sdoc)
    db_session.refresh(new_project_metadata)

    return {
        "project": project,
        "source_document": sdoc,
        "project_metadata": new_project_metadata,
    }


class ProjectWithSourceDocumentAndProjMetadataAndSdocMetadata(
    ProjectWithSourceDocumentAndProjMeta
):
    source_document_metadata: SourceDocumentMetadataORM


@pytest.fixture(scope="function")
def project_with_sdoc_and_projmeta_and_sdocmeta(
    db_session, project_with_sdoc_and_projmeta_and_sdocmeta, test_user
) -> ProjectWithSourceDocumentAndProjMetadataAndSdocMetadata:
    """Create a project for the test user with a source document and new project metadata."""
    project = project_with_sdoc_and_projmeta_and_sdocmeta["project"]
    sdoc = project_with_sdoc_and_projmeta_and_sdocmeta["source_document"]
    pm = project_with_sdoc_and_projmeta_and_sdocmeta["project_metadata"]

    # Create sdoc metadata for the project
    new_sdoc_metadata = crud_sdoc_meta.create(
        db=db_session,
        create_dto=SourceDocumentMetadataCreate.with_metatype(
            metatype=pm.metatype,
            value="Test Value",
            project_metadata_id=pm.id,
            source_document_id=sdoc.id,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(sdoc)
    db_session.refresh(pm)
    db_session.refresh(new_sdoc_metadata)

    return {
        "project": project,
        "source_document": sdoc,
        "project_metadata": pm,
        "source_document_metadata": new_sdoc_metadata,
    }


class ProjectWithSourceDocumentAndMetadataForTest(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM
    project_metadata: list[ProjectMetadataORM]
