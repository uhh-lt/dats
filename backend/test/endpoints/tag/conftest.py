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


class ProjectWithSdocAndTag(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM
    tag: TagORM


@pytest.fixture(scope="function")
def project_with_sdoc_and_tag(db_session, project_with_sdoc) -> ProjectWithSdocAndTag:
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
    crud_tag.link_multiple_tags(db=db_session, sdoc_ids=[sdoc.id], tag_ids=[tag.id])

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
    db_session, project_with_sdoc_and_tag
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
    crud_tag.link_multiple_tags(db=db_session, sdoc_ids=[sdoc.id], tag_ids=[tag2.id])

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
    db_session, test_project
) -> ProjectWithMultipleSdocsAndMultipleTags:
    """Create a project with multiple source documents and tags. The first tag is linked to both source documents, the second tag is linked only to the first source document."""

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
    crud_tag.set_tags(db=db_session, sdoc_id=sdoc1.id, tag_ids=[tag1.id, tag2.id])
    crud_tag.set_tags(db=db_session, sdoc_id=sdoc2.id, tag_ids=[tag1.id])

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
