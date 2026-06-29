from typing import TypedDict
from uuid import uuid4

import pytest

from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import (
    AttachedObjectType,
    MemoCreate,
    MemoCreateIntern,
)
from core.memo.memo_orm import MemoORM
from core.project.project_orm import ProjectORM


class ProjectWithCode(TypedDict):
    project: ProjectORM
    code: CodeORM


@pytest.fixture(scope="function")
def project_with_code(db_session, test_project) -> ProjectWithCode:
    """Create a project for the test user with a code."""

    # Create a code in the project
    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Memo Target Code",
            color="Blue",
            description="Code for memo test",
            parent_id=None,
            enabled=True,
            project_id=test_project.id,
            is_system=False,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(code)

    return {"project": test_project, "code": code}


class ProjectWithCodeAndMemo(ProjectWithCode):
    memo: MemoORM


@pytest.fixture(scope="function")
def project_with_code_and_memo(
    db_session, project_with_code, test_user
) -> ProjectWithCodeAndMemo:
    """Create a project for the test user with a code and a memo attached to the code."""

    project = project_with_code["project"]
    code = project_with_code["code"]

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


class ProjectWithCodeAndMultipleMemos(ProjectWithCode):
    memos: list[MemoORM]


@pytest.fixture(scope="function")
def project_with_code_and_multiple_memos(
    db_session, project_with_code, test_user
) -> ProjectWithCodeAndMultipleMemos:
    """Create a project with a code and multiple (3) memos attached to it."""

    project = project_with_code["project"]
    code = project_with_code["code"]

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
