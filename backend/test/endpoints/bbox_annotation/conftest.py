from typing import TypedDict

import pytest

from common.doc_type_enum import DocType
from composite_keys_test_utils import TwoTenants, create_two_tenants
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import BBoxAnnotationCreate
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.bbox_annotation_service import BBoxAnnotationService
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from provenance_test_utils import (
    ProvenanceProject,
    ProvenanceProjectWithCopies,
    create_provenance_copies,
    create_provenance_project,
)


class ProjectWithBBoxAnnotation(TypedDict):
    """
    The test project (`project`) of the test user with:

    - the image documents "Test Image.jpg" (`source_document`) and
      "Second Image.jpg" (`source_document2`),
    - the enabled codes "Test Code" (`code`) and "Test Code 2" (`code2`),
    - three bbox annotations of the test user:
      - `bbox_annotation`: "Test Image.jpg", "Test Code", (1, 2)..(5, 6),
      - `bbox_annotation2`: "Test Image.jpg", "Test Code 2", (10, 20)..(50, 60),
      - `bbox_annotation3`: "Second Image.jpg", "Test Code", (3, 4)..(7, 8).
    """

    project: ProjectORM
    source_document: SourceDocumentORM
    source_document2: SourceDocumentORM
    code: CodeORM
    code2: CodeORM
    bbox_annotation: BBoxAnnotationORM
    bbox_annotation2: BBoxAnnotationORM
    bbox_annotation3: BBoxAnnotationORM


def _create_image(db_session, *, project_id: int, name: str) -> SourceDocumentORM:
    return crud_sdoc.create(
        db=db_session,
        project_id=project_id,
        create_dto=SourceDocumentCreate(
            filename=f"{name}.jpg",
            name=name,
            doctype=DocType.image,
            folder_id=None,
        ),
    )


def _create_code(db_session, *, project_id: int, name: str) -> CodeORM:
    return crud_code.create(
        db=db_session,
        project_id=project_id,
        create_dto=CodeCreate(
            name=name,
            color="Red",
            description=f"{name} for bbox annotations",
            parent_id=None,
            enabled=True,
            is_system=False,
        ),
    )


@pytest.fixture(scope="function")
def project_with_bbox_annotation(
    db_session, test_project, test_user
) -> ProjectWithBBoxAnnotation:
    """The project described in `ProjectWithBBoxAnnotation`."""
    project_id = test_project.id
    sdoc = _create_image(db_session, project_id=project_id, name="Test Image")
    sdoc2 = _create_image(db_session, project_id=project_id, name="Second Image")
    code = _create_code(db_session, project_id=project_id, name="Test Code")
    code2 = _create_code(db_session, project_id=project_id, name="Test Code 2")

    created = BBoxAnnotationService().create_multi(
        db=db_session,
        project_id=project_id,
        user_id=test_user.id,
        create_dtos=[
            BBoxAnnotationCreate(
                x_min=1, x_max=5, y_min=2, y_max=6, code_id=code.id, sdoc_id=sdoc.id
            ),
            BBoxAnnotationCreate(
                x_min=10,
                x_max=50,
                y_min=20,
                y_max=60,
                code_id=code2.id,
                sdoc_id=sdoc.id,
            ),
            BBoxAnnotationCreate(
                x_min=3, x_max=7, y_min=4, y_max=8, code_id=code.id, sdoc_id=sdoc2.id
            ),
        ],
    )
    db_session.commit()
    bbox1, bbox2, bbox3 = (
        crud_bbox_anno.read(db=db_session, project_id=project_id, id=dto.id)
        for dto in created
    )

    return {
        "project": test_project,
        "source_document": sdoc,
        "source_document2": sdoc2,
        "code": code,
        "code2": code2,
        "bbox_annotation": bbox1,
        "bbox_annotation2": bbox2,
        "bbox_annotation3": bbox3,
    }


@pytest.fixture(scope="function")
def provenance_project(db_session, test_user, project_with_sdoc) -> ProvenanceProject:
    """The projects described in `ProvenanceProject`."""
    return create_provenance_project(db_session, test_user, project_with_sdoc)


@pytest.fixture(scope="function")
def provenance_project_with_copies(
    db_session, provenance_project
) -> ProvenanceProjectWithCopies:
    """The project described in `ProvenanceProjectWithCopies`."""
    return create_provenance_copies(db_session, provenance_project)


@pytest.fixture(scope="function")
def tenants(db_session, test_user, test_project) -> TwoTenants:
    """The rows of every project-owned table in the test project and in "Foreign
    Project" (composite_keys_test_utils.TwoTenants and TenantRows list them)."""
    return create_two_tenants(db_session, user=test_user, project=test_project)
