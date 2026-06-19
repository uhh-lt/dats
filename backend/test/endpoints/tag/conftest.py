from typing import TypedDict

import pytest

from common.doc_type import DocType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.tag.tag_orm import TagORM


class ProjectWithSDoc(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM


@pytest.fixture(scope="function")
def project_with_sdoc(db_session, test_project, test_user) -> ProjectWithSDoc:
    """Create a project for the test user with a source document."""

    # Create a source document in the project
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


class ProjectWithSdocAndTag(ProjectWithSDoc):
    tag: TagORM


@pytest.fixture(scope="function")
def project_with_sdoc_and_tag(
    db_session, project_with_sdoc, test_user
) -> ProjectWithSdocAndTag:
    """Create a project for the test user with a source document and a tag linked to it."""

    project = project_with_sdoc["project"]
    sdoc = project_with_sdoc["source_document"]

    # Create a tag in the project
    tag = crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="Test Tag",
            project_id=project.id,
        ),
    )

    # Link the tag to the source document
    sdoc.tags.append(tag)

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(sdoc)
    db_session.refresh(tag)

    return {
        "project": project,
        "source_document": sdoc,
        "tag": tag,
    }


class ProjectWithSdocAndMultipleTags(ProjectWithSdocAndTag):
    tag2: TagORM


@pytest.fixture(scope="function")
def project_with_sdoc_and_multiple_tags(
    db_session, project_with_sdoc_and_tag, test_user
) -> ProjectWithSdocAndMultipleTags:
    """Create a project for the test user with a source document and multiple tags linked to it."""

    project = project_with_sdoc_and_tag["project"]
    sdoc = project_with_sdoc_and_tag["source_document"]
    tag = project_with_sdoc_and_tag["tag"]

    # Create a second tag in the project
    tag2 = crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="Test Tag 2",
            project_id=project.id,
        ),
    )

    # Link the second tag to the source document
    sdoc.tags.append(tag2)

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(sdoc)
    db_session.refresh(tag)
    db_session.refresh(tag2)

    return {
        "project": project,
        "source_document": sdoc,
        "tag": tag,
        "tag2": tag2,
    }


class ProjectWithMultipleSdocsAndMultipleTags(TypedDict):
    project: ProjectORM
    source_document1: SourceDocumentORM
    source_document2: SourceDocumentORM
    tag1: TagORM
    tag2: TagORM


@pytest.fixture(scope="function")
def project_with_multiple_sdocs_and_multiple_tags(
    db_session, test_project, test_user
) -> ProjectWithMultipleSdocsAndMultipleTags:
    """Create a project with multiple source documents and tags."""

    # Create two source documents in the project
    sdoc1 = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="a.txt",
            name="A",
            doctype=DocType.text,
            project_id=test_project.id,
            folder_id=None,
        ),
    )
    sdoc2 = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="b.txt",
            name="B",
            doctype=DocType.text,
            project_id=test_project.id,
            folder_id=None,
        ),
    )

    # Create two tags in the project
    tag1 = crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="T1",
            color="red",
            description="d",
            parent_id=None,
            project_id=test_project.id,
        ),
    )
    tag2 = crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="T2",
            color="blue",
            description="d",
            parent_id=None,
            project_id=test_project.id,
        ),
    )

    # Link tags to source documents
    sdoc1.tags.extend([tag1, tag2])
    sdoc2.tags.append(tag2)

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(sdoc1)
    db_session.refresh(sdoc2)
    db_session.refresh(tag1)
    db_session.refresh(tag2)

    return {
        "project": test_project,
        "source_document1": sdoc1,
        "source_document2": sdoc2,
        "tag1": tag1,
        "tag2": tag2,
    }
