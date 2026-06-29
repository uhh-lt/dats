from typing import TypedDict

import pytest

from common.doc_type import DocType
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import BBoxAnnotationCreate
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM


class ProjectWithBBoxAnnotation(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM
    code: CodeORM
    bbox_annotation: BBoxAnnotationORM


@pytest.fixture(scope="function")
def project_with_bbox_annotation(
    db_session, test_project, test_user
) -> ProjectWithBBoxAnnotation:
    """Create a project for the test user with an image source document, code, and bounding box annotation."""

    # Create a source document in the project (image document)
    sdoc = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="Test Image.jpg",
            name="Image",
            doctype=DocType.image,
            project_id=test_project.id,
            folder_id=None,
        ),
    )

    # Create a code in the project
    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Test Code",
            color="Red",
            description="Test code for bbox annotation",
            parent_id=None,
            enabled=True,
            project_id=test_project.id,
            is_system=False,
        ),
    )

    # Create a bounding box annotation
    bbox_annotation = crud_bbox_anno.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=BBoxAnnotationCreate(
            x_min=1,
            x_max=5,
            y_min=2,
            y_max=6,
            code_id=code.id,
            sdoc_id=sdoc.id,
        ),
    )
    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(sdoc)
    db_session.refresh(code)
    db_session.refresh(bbox_annotation)

    return {
        "project": test_project,
        "source_document": sdoc,
        "code": code,
        "bbox_annotation": bbox_annotation,
    }
