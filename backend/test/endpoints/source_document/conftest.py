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
from core.doc.source_document_dto import (
    SourceDocumentCreate,
)
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM


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
            filename="test_document1.txt",
            name="Test Document 1",
            doctype=DocType.text,
            project_id=test_project.id,
            folder_id=folder.id,
        ),
    )

    crud_sdoc_data.create(
        db=db_session,
        create_dto=SourceDocumentDataCreate(
            id=sdoc1.id,
            content="This is a test document. It has two sentences.",
            repo_url="/fake/path/to/test_document1.txt",
            raw_html="<p>This is a test document. It has two sentences.</p>",
            html="<p><sent>This is a test document.</sent> <sent>It has two sentences.</sent></p>",
            token_starts=[0, 5, 8, 10, 15, 25, 28, 32, 36],
            token_ends=[4, 7, 9, 14, 23, 27, 31, 35, 45],
            sentence_starts=[0, 25],
            sentence_ends=[24, 46],
            token_time_starts=None,
            token_time_ends=None,
        ),
    )

    # Create another source document in the same folder
    sdoc2 = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="test_document2.txt",
            name="Test Document 2",
            doctype=DocType.text,
            project_id=test_project.id,
            folder_id=folder.id,
        ),
    )

    crud_sdoc_data.create(
        db=db_session,
        create_dto=SourceDocumentDataCreate(
            id=sdoc2.id,
            content="This is a test document. It has two sentences.",
            repo_url="/fake/path/to/test_document2.txt",
            raw_html="<p>This is a test document. It has two sentences.</p>",
            html="<p><sent>This is a test document.</sent> <sent>It has two sentences.</sent></p>",
            token_starts=[0, 5, 8, 10, 15, 25, 28, 32, 36],
            token_ends=[4, 7, 9, 14, 23, 27, 31, 35, 45],
            sentence_starts=[0, 25],
            sentence_ends=[24, 46],
            token_time_starts=None,
            token_time_ends=None,
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
    db_session, project_with_sdoc, test_user
) -> ProjectWithSentenceAnnotation:
    """Create a project for the test user with a source document, code, and sentence annotation."""

    project = project_with_sdoc["project"]
    sdoc = project_with_sdoc["source_document"]

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
