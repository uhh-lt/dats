from typing import TypedDict

import pytest

from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM


class ProjectWithSdocAndCode(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM
    code: CodeORM


@pytest.fixture(scope="function")
def project_with_sdoc_and_code(db_session, project_with_sdoc) -> ProjectWithSdocAndCode:
    """Create a project for the test user with a source document and code."""

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

    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(sdoc)
    db_session.refresh(code)

    return {
        "project": project,
        "source_document": sdoc,
        "code": code,
    }


class ProjectWithSentenceAnnotation(ProjectWithSdocAndCode):
    sentence_annotation: SentenceAnnotationORM


@pytest.fixture(scope="function")
def project_with_sentence_annotation(
    db_session, project_with_sdoc_and_code, test_user
) -> ProjectWithSentenceAnnotation:
    """Create a project for the test user with a source document, code, and sentence annotation (of the first sentence)."""

    project = project_with_sdoc_and_code["project"]
    sdoc = project_with_sdoc_and_code["source_document"]
    code = project_with_sdoc_and_code["code"]

    # Create a sentence annotation
    sentence_annotation = crud_sentence_anno.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=0,
            sentence_id_end=0,
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


class ProjectWithMultipleSentenceAnnotations(ProjectWithSdocAndCode):
    sentence_annotations: list[SentenceAnnotationORM]


@pytest.fixture(scope="function")
def project_with_multiple_sentence_annotations(
    db_session, project_with_sdoc_and_code, test_user
) -> ProjectWithMultipleSentenceAnnotations:
    """Create a project for the test user with a source document, code, and two sentence annotations."""

    project = project_with_sdoc_and_code["project"]
    sdoc = project_with_sdoc_and_code["source_document"]
    code = project_with_sdoc_and_code["code"]

    # Create multiple (2) sentence annotations
    [sentence_anno1, sentence_anno2] = crud_sentence_anno.create_bulk(
        db=db_session,
        user_id=test_user.id,
        create_dtos=[
            SentenceAnnotationCreate(
                sentence_id_start=0,
                sentence_id_end=0,
                code_id=code.id,
                sdoc_id=sdoc.id,
            ),
            SentenceAnnotationCreate(
                sentence_id_start=1,
                sentence_id_end=1,
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
    db_session.refresh(sentence_anno1)
    db_session.refresh(sentence_anno2)

    return {
        "project": project,
        "source_document": sdoc,
        "code": code,
        "sentence_annotations": [sentence_anno1, sentence_anno2],
    }


class ProjectWithMultipleSentenceAnnotationsAndNewCode(
    ProjectWithMultipleSentenceAnnotations
):
    new_code: CodeORM


@pytest.fixture(scope="function")
def project_with_multiple_sentence_annotations_and_new_code(
    db_session, project_with_multiple_sentence_annotations
) -> ProjectWithMultipleSentenceAnnotationsAndNewCode:
    """Create a project for the test user with a source document, code, two sentence annotations, and a new code."""

    project = project_with_multiple_sentence_annotations["project"]
    sdoc = project_with_multiple_sentence_annotations["source_document"]
    code = project_with_multiple_sentence_annotations["code"]
    sentence_annotations = project_with_multiple_sentence_annotations[
        "sentence_annotations"
    ]

    # Create a new code
    new_code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="New Test Code",
            color="Blue",
            description="New test code for sentence annotation",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(new_code)

    return {
        "project": project,
        "source_document": sdoc,
        "code": code,
        "new_code": new_code,
        "sentence_annotations": sentence_annotations,
    }
