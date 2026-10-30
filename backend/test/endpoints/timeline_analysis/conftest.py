from datetime import date
from typing import TypedDict

import pytest
from sqlalchemy.orm import Session

import dats_test_utils
from common.doc_type_enum import DocType
from common.meta_type_enum import MetaType
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataCreate
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM


class TimelineProject(TypedDict):
    project: ProjectORM
    published_field: ProjectMetadataORM


@pytest.fixture(scope="function")
def timeline_project(
    db_session: Session, test_project: ProjectORM, test_user: UserORM
) -> TimelineProject:
    """
    This fixture sets up the following project:

    - Project "Simple Test Project" (`project`) of the test user, with its system
      codes and metadata, plus:
      - the code "Person",
      - the date metadata field "published" (`published_field`) of text documents,
      - the text document "Report" ("Alice met Bob in Berlin. It rained."),
        published on 2020-05-01, with two span annotations of the test user with
        the code "Person":
        - "Alice met Bob" (3 words: tokens 0 to 3, end exclusive),
        - "Berlin." (1 word: token 4).

    Non-obvious derived behavior:

    - A timeline analysis of span annotations grouped by year has one result,
      "2020", whose two data ids are the two span annotations.
    """
    person_code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Person",
            color="red",
            description="A person",
            parent_id=None,
            enabled=True,
            project_id=test_project.id,
            is_system=False,
        ),
    )
    report = dats_test_utils.create_text_document(
        db_session,
        project=test_project,
        filename="report.txt",
        name="Report",
        sentences=["Alice met Bob in Berlin.", "It rained."],
    )
    published_field = crud_project_meta.create(
        db=db_session,
        create_dto=ProjectMetadataCreate(
            key="published",
            metatype=MetaType.DATE,
            doctype=DocType.text,
            description="Publication date",
            project_id=test_project.id,
        ),
    )
    crud_sdoc_meta.read_by_sdoc_and_key(
        db=db_session, sdoc_id=report.id, key="published"
    ).date_value = date(2020, 5, 1)
    for text in ["Alice met Bob", "Berlin."]:
        dats_test_utils.create_span_for_text(
            db_session,
            sdoc=report,
            text=text,
            code_id=person_code.id,
            user_id=test_user.id,
        )
    db_session.commit()

    return {"project": test_project, "published_field": published_field}
