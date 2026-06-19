from typing import TypedDict
from uuid import uuid4

import pytest

from common.doc_type import DocType
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import (
    AttachedObjectType,
    MemoCreate,
    MemoCreateIntern,
)
from core.memo.memo_orm import MemoORM
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService


class ProjectWithCode(TypedDict):
    project: ProjectORM
    code: CodeORM


@pytest.fixture(scope="function")
def project_with_code(db_session, test_user) -> ProjectWithCode:
    """Create a project for the test user with a code."""

    project_dto = ProjectCreate(
        title="Test Project",
        description="A project for testing memos",
    )

    # Use ProjectService to create the project with all infrastructure
    ps = ProjectService()
    project = ps.create_project(
        db=db_session,
        create_dto=project_dto,
        creating_user_id=test_user.id,
    )

    # Create a code in the project
    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Memo Target Code",
            color="Blue",
            description="Code for memo test",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(code)

    return {"project": project, "code": code}


class ProjectWithCodeAndMemo(TypedDict):
    project: ProjectORM
    code: CodeORM
    memo: MemoORM


@pytest.fixture(scope="function")
def project_with_code_and_memo(db_session, test_user) -> ProjectWithCodeAndMemo:
    """Create a project for the test user with a code and a memo attached to the code."""

    project_dto = ProjectCreate(
        title="Test Project",
        description="A project for testing memos",
    )

    # Use ProjectService to create the project with all infrastructure
    ps = ProjectService()
    project = ps.create_project(
        db=db_session,
        create_dto=project_dto,
        creating_user_id=test_user.id,
    )

    # Create a code in the project
    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Memo Target Code",
            color="Blue",
            description="Code for memo test",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        ),
    )

    # Create a memo attached to the code
    memo_create = MemoCreate(
        title="First Memo Test",
        content="This is the content of the first test memo.",
        content_json='{"blocks": [{"type": "paragraph", "data": {"text": "This is content."}}]}',
        starred=True,
    )
    memo_create_intern = MemoCreateIntern(
        uuid=str(uuid4()),
        title=memo_create.title,
        content=memo_create.content,
        content_json=memo_create.content_json,
        starred=memo_create.starred,
        user_id=test_user.id,
        project_id=project.id,
    )
    memo = crud_memo.create_for_attached_object(
        db=db_session,
        attached_object_id=code.id,
        attached_object_type=AttachedObjectType.code,
        create_dto=memo_create_intern,
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(code)
    db_session.refresh(memo)

    return {"project": project, "code": code, "memo": memo}


class ProjectWithSourceDocument(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM


@pytest.fixture(scope="function")
def project_with_source_document(db_session, test_user) -> ProjectWithSourceDocument:
    """Create a project for the test user with a source document."""

    project_dto = ProjectCreate(
        title="Test Project",
        description="A project for testing memos",
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
            filename="Source Document",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(sdoc)

    return {"project": project, "source_document": sdoc}


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

    from core.annotation.sentence_annotation_crud import crud_sentence_anno
    from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate

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


class ProjectWithCodeAndMultipleMemos(TypedDict):
    project: ProjectORM
    code: CodeORM
    memos: list[MemoORM]


@pytest.fixture(scope="function")
def project_with_code_and_multiple_memos(
    db_session, test_user
) -> ProjectWithCodeAndMultipleMemos:
    """Create a project with a code and multiple (3) memos attached to it."""

    project_dto = ProjectCreate(
        title="Test Project",
        description="A project for testing multiple memos",
    )

    ps = ProjectService()
    project = ps.create_project(
        db=db_session,
        create_dto=project_dto,
        creating_user_id=test_user.id,
    )

    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Memo Target Code",
            color="Blue",
            description="Code for memo test",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        ),
    )

    EXPECTED_COUNT = 3
    memos = []
    for i in range(EXPECTED_COUNT):
        memo = crud_memo.create_for_attached_object(
            db=db_session,
            attached_object_id=code.id,
            attached_object_type=AttachedObjectType.code,
            create_dto=MemoCreateIntern(
                uuid=str(uuid4()),
                title=f"Memo {i}",
                content=f"Content {i}",
                content_json='{"blocks": []}',
                starred=False,
                user_id=test_user.id,
                project_id=project.id,
            ),
        )
        memos.append(memo)

    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(code)
    for memo in memos:
        db_session.refresh(memo)

    return {"project": project, "code": code, "memos": memos}
