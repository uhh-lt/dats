from typing import TypedDict

import pytest

from common.doc_type import DocType
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from core.doc.folder_orm import FolderORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataCreate
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_dto import (
    SourceDocumentCreate,
)
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService


class ProjectWithSourceDocument(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM


@pytest.fixture(scope="function")
def project_with_source_document(test_project, db_session) -> ProjectWithSourceDocument:
    """Create a project for the test user with a source document."""

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


class ProjectWithSourceDocumentData(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM
    source_document_data: SourceDocumentDataORM


@pytest.fixture(scope="function")
def project_with_source_document_data(
    db_session, test_user
) -> ProjectWithSourceDocumentData:
    """Create a project for the test user with a source document and its data."""

    project_dto = ProjectCreate(
        title="Test Project",
        description="A project for testing source documents",
    )

    # Use ProjectService to create the project with all infrastructure
    ps = ProjectService()
    project = ps.create_project(
        db=db_session,
        create_dto=project_dto,
        creating_user_id=test_user.id,
    )

    # Create a source document in the project
    sdoc = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="Test Document",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        ),
    )

    # Create source document data
    sdoc_data = crud_sdoc_data.create(
        db=db_session,
        create_dto=SourceDocumentDataCreate(
            id=sdoc.id,
            content="Sentence 0. Sentence 1. Sentence 2. Sentence 3.",
            repo_url="/fake/path/to/doc/in/repo",
            raw_html="<html>Sentence 0. Sentence 1. Sentence 2. Sentence 3.</html>",
            html="<html>Sentence 0. Sentence 1. Sentence 2. Sentence 3.</html>",
            token_starts=[0],
            token_ends=[0],
            sentence_starts=[0, 13, 26, 39],
            sentence_ends=[11, 24, 37, 50],
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(sdoc)
    db_session.refresh(sdoc_data)

    return {
        "project": project,
        "source_document": sdoc,
        "source_document_data": sdoc_data,
    }


class ProjectWithSdocsInSameFolder(TypedDict):
    project: ProjectORM
    folder: FolderORM
    source_documents: list[SourceDocumentORM]


@pytest.fixture(scope="function")
def project_with_sdocs_in_same_folder(
    db_session, test_project
) -> ProjectWithSdocsInSameFolder:
    """Create a project for the test user with two source documents in the same folder."""

    # Create a folder in the project
    folder = crud_folder.create(
        db=db_session,
        create_dto=FolderCreate(
            name="Test Folder",
            project_id=test_project.id,
            parent_id=None,
            folder_type=FolderType.SDOC_FOLDER,
        ),
    )

    # Create a source document in the folder
    sdoc1 = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="Test Document 1",
            name="Document 1",
            doctype=DocType.text,
            project_id=test_project.id,
            folder_id=folder.id,
        ),
    )

    # Create another source document in the same folder
    sdoc2 = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="Test Document 2",
            name="Document 2",
            doctype=DocType.text,
            project_id=test_project.id,
            folder_id=folder.id,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(folder)
    db_session.refresh(sdoc1)
    db_session.refresh(sdoc2)

    return {
        "project": test_project,
        "folder": folder,
        "source_documents": [sdoc1, sdoc2],
    }


class ProjectWithSentenceAnnotation(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM
    code: CodeORM
    sentence_annotation: SentenceAnnotationORM


@pytest.fixture(scope="function")
def project_with_sentence_annotation(
    db_session, test_user
) -> ProjectWithSentenceAnnotation:
    """Create a project for the test user with a source document, code, and sentence annotation."""

    project_dto = ProjectCreate(
        title="Test Project",
        description="A project for testing sentence annotations",
    )

    # Use ProjectService to create the project with all infrastructure
    ps = ProjectService()
    project = ps.create_project(
        db=db_session,
        create_dto=project_dto,
        creating_user_id=test_user.id,
    )

    # Create a source document in the project
    sdoc = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="Test Document",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        ),
    )

    # Create a code in the project
    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Test Code",
            color="Red",
            description="Test code for sentence annotation",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        ),
    )

    # Create a sentence annotation
    sentence_annotation = crud_sentence_anno.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=0,
            sentence_id_end=1,
            code_id=code.id,
            sdoc_id=sdoc.id,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(sdoc)
    db_session.refresh(code)
    db_session.refresh(sentence_annotation)

    return {
        "project": project,
        "source_document": sdoc,
        "code": code,
        "sentence_annotation": sentence_annotation,
    }
