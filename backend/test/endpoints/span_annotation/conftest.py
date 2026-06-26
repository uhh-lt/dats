from typing import TypedDict

import pytest

from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_group_dto import SpanGroupCreate
from core.annotation.span_group_orm import SpanGroupORM
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM


class ProjectWithSpanAnnotation(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM
    code: CodeORM
    span_annotation: SpanAnnotationORM


@pytest.fixture(scope="function")
def project_with_span_annotation(
    db_session, project_with_sdoc, test_user
) -> ProjectWithSpanAnnotation:
    """Create a project for the test user with a source document, code, and span annotation."""

    project = project_with_sdoc["project"]
    sdoc = project_with_sdoc["source_document"]

    # Create a code in the project
    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Test Code",
            color="Red",
            description="Test code for span annotation",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        ),
    )

    # Create a span annotation
    span_annotation = crud_span_anno.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            span_text="This is a test",
            begin=0,
            end=14,
            begin_token=0,
            end_token=3,
            code_id=code.id,
            sdoc_id=sdoc.id,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(sdoc)
    db_session.refresh(code)
    db_session.refresh(span_annotation)

    return {
        "project": project,
        "source_document": sdoc,
        "code": code,
        "span_annotation": span_annotation,
    }


class ProjectWithSpanAnnotationsForBulkTest(ProjectWithSpanAnnotation):
    span_annotation2: SpanAnnotationORM
    code2: CodeORM


@pytest.fixture(scope="function")
def project_with_span_annotations_for_bulk_test(
    db_session, test_user, project_with_span_annotation
) -> ProjectWithSpanAnnotationsForBulkTest:
    """Create a project with multiple span annotations and codes for bulk tests."""

    project = project_with_span_annotation["project"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]
    span_annotation = project_with_span_annotation["span_annotation"]

    # Create a second code for updating
    code2 = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="code-2",
            color="blue",
            description="desc",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        ),
    )

    # Create a second span annotation
    span_annotation2 = crud_span_anno.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            span_text="two sentences",
            begin=32,
            end=45,
            begin_token=8,
            end_token=9,
            code_id=code.id,
            sdoc_id=sdoc.id,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(code2)
    db_session.refresh(span_annotation2)

    return {
        "project": project,
        "source_document": sdoc,
        "code": code,
        "span_annotation": span_annotation,
        "span_annotation2": span_annotation2,
        "code2": code2,
    }


class ProjectWithSpanAnnotationsForCountTest(ProjectWithSpanAnnotation):
    span_annotation2: SpanAnnotationORM


@pytest.fixture(scope="function")
def project_with_span_annotations_for_count_test(
    db_session, test_user, project_with_span_annotation
) -> ProjectWithSpanAnnotationsForCountTest:
    """Create a project with multiple span annotations for count tests."""

    project = project_with_span_annotation["project"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]
    span_annotation = project_with_span_annotation["span_annotation"]

    # Create a second span annotation
    span_annotation2 = crud_span_anno.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            span_text="two sentences",
            begin=32,
            end=45,
            begin_token=8,
            end_token=9,
            code_id=code.id,
            sdoc_id=sdoc.id,
        ),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(span_annotation2)

    return {
        "project": project,
        "source_document": sdoc,
        "code": code,
        "span_annotation": span_annotation,
        "span_annotation2": span_annotation2,
    }


class ProjectWithSpanAnnotationsAndGroup(ProjectWithSpanAnnotation):
    span_group: SpanGroupORM


@pytest.fixture(scope="function")
def project_with_span_annotations_and_group(
    db_session, test_user, project_with_span_annotation
) -> ProjectWithSpanAnnotationsAndGroup:
    """Create a project for the test user with a source document, a code, a span annotation, and a span group."""

    project = project_with_span_annotation["project"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]
    span_annotation = project_with_span_annotation["span_annotation"]

    # Create a span group
    span_group = crud_span_group.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=SpanGroupCreate(name="g1", sdoc_id=sdoc.id),
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(span_group)

    return {
        "project": project,
        "source_document": sdoc,
        "code": code,
        "span_annotation": span_annotation,
        "span_group": span_group,
    }


@pytest.fixture(scope="function")
def project_with_span_annotations_and_linked_group(
    db_session, test_user, project_with_span_annotation
) -> ProjectWithSpanAnnotationsAndGroup:
    """Create a project for the test user with a source document, a code, a span annotation, and a span group. The span annotation is linked to the span group."""

    project = project_with_span_annotation["project"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]
    span_annotation = project_with_span_annotation["span_annotation"]

    # Create a span group
    span_group = crud_span_group.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=SpanGroupCreate(name="g1", sdoc_id=sdoc.id),
    )

    # Link the span annotation to the group
    crud_span_group.link_groups_spans_batch(
        db=db_session, links={span_group.id: [span_annotation.id]}
    )

    # Commit the changes to the database and refresh the objects
    db_session.commit()
    db_session.refresh(span_group)

    return {
        "project": project,
        "source_document": sdoc,
        "code": code,
        "span_annotation": span_annotation,
        "span_group": span_group,
    }
