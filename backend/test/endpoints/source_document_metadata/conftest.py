from typing import TypedDict

import pytest

from common.doc_type import DocType
from common.meta_type import MetaType
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataCreate
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from core.project.project_orm import ProjectORM


class ProjectWithSdocAndProjMetaAndSdocMeta(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM
    project_metadata: ProjectMetadataORM
    source_document_metadata: SourceDocumentMetadataORM


@pytest.fixture(scope="function")
def project_with_sdoc_and_projmeta_and_sdocmeta(
    db_session, project_with_sdoc
) -> ProjectWithSdocAndProjMetaAndSdocMeta:
    """Create a project for the test user with a source document and new project metadata."""
    project = project_with_sdoc["project"]
    sdoc = project_with_sdoc["source_document"]

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

    # Source document metadata is automatically created for each source document when project metadata is created.
    # For this test setup, there is only one source document, so we can retrieve the first source document metadata.
    sdoc_metadata = new_project_metadata.sdoc_metadata[0]

    return {
        "project": project,
        "source_document": sdoc,
        "project_metadata": new_project_metadata,
        "source_document_metadata": sdoc_metadata,
    }
