from typing import TypedDict

import pytest

from common.doc_type import DocType
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService


class ProjectWithSdocAndCode(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM
    code: CodeORM


@pytest.fixture(scope="function")
def project_with_sdoc_and_code(db_session, test_user) -> ProjectWithSdocAndCode:
    """Create a project for the test user with a source document and code."""

    project_dto = ProjectCreate(
        title="Test Project",
        description="A project for testing sentence annotations",
    )

    ps = ProjectService()
    project = ps.create_project(
        db=db_session,
        create_dto=project_dto,
        creating_user_id=test_user.id,
    )

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

    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(sdoc)
    db_session.refresh(code)

    return {
        "project": project,
        "source_document": sdoc,
        "code": code,
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


class ProjectWithMultipleSentenceAnnotations(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM
    code: CodeORM
    sentence_annotations: list[SentenceAnnotationORM]


@pytest.fixture(scope="function")
def project_with_multiple_sentence_annotations(
    db_session, test_user
) -> ProjectWithMultipleSentenceAnnotations:
    """Create a project for the test user with a source document, code, and two sentence annotations."""

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

    # Create multiple (2) sentence annotations
    sentence_annotations = crud_sentence_anno.create_bulk(
        db=db_session,
        user_id=test_user.id,
        create_dtos=[
            SentenceAnnotationCreate(
                sentence_id_start=0,
                sentence_id_end=1,
                code_id=code.id,
                sdoc_id=sdoc.id,
            ),
            SentenceAnnotationCreate(
                sentence_id_start=2,
                sentence_id_end=3,
                code_id=code.id,
                sdoc_id=sdoc.id,
            ),
        ],
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(sdoc)
    db_session.refresh(code)
    db_session.refresh(sentence_annotations)

    return {
        "project": project,
        "source_document": sdoc,
        "code": code,
        "sentence_annotations": sentence_annotations,
    }
