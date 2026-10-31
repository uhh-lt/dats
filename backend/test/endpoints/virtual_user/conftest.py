from typing import TypedDict

import pytest

from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_annotation_service import SpanAnnotationService
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM
from core.user.user_service import UserService
from dats_test_utils import create_span_for_text, create_text_document

SENTENCES = ["Alpha beta gamma.", "Delta epsilon zeta."]


class VirtualUserProject(TypedDict):
    project: ProjectORM
    other_project: ProjectORM
    target_project: ProjectORM
    user: UserORM
    other_user: UserORM
    run1: UserORM
    run2: UserORM
    other_run: UserORM
    code: CodeORM
    sdoc: SourceDocumentORM
    other_sdoc: SourceDocumentORM
    run1_alpha: SpanAnnotationORM
    run1_delta: SpanAnnotationORM
    user_alpha_copy: SpanAnnotationORM


@pytest.fixture(scope="function")
def virtual_user_project(
    db_session, test_user: UserORM, test_project: ProjectORM
) -> VirtualUserProject:
    """
    This fixture sets up the following projects:

    - `project` (the test project of the test user `user`):
      - members: the system user and `user` (the test user)
      - virtual users: `run1` ("ExperimentA-Run1") and `run2`
        ("ExperimentA-Run2"), created through `UserService`
      - code `code` ("Claim")
      - document `sdoc` ("va_doc.txt") with the sentences "Alpha beta gamma." and
        "Delta epsilon zeta."
      - span annotations of `run1` on `sdoc`: `run1_alpha` ("Alpha", Claim) and
        `run1_delta` ("Delta", Claim)
      - span annotation of `user` on `sdoc`: `user_alpha_copy` ("Alpha", Claim),
        a copy of `run1_alpha` (accepted in the comparison), so its provenance
        records `run1` as source user
      - `run2` has no annotations
    - `other_project` ("Other Project") of `other_user` ("other@dats.org"), which
      `user` is no member of:
      - virtual user `other_run` ("ExperimentB-Run1")
      - document `other_sdoc` ("other_doc.txt")
    - `target_project` ("Target Project") of `user`, to import into: code
      "Claim" and document "va_doc.txt" with the same sentences, no annotations

    Non-obvious derived behavior:

    - Virtual users are no project members, but `/user/{project_id}/user` lists
      them after the members: the system user, `user`, `run1`, `run2`.
    - Virtual users have no email and no password, so they can never log in.
    """
    project = test_project

    # 1) virtual users, a code and a document with annotations
    run1 = UserService().create_virtual_user(
        db=db_session, project_id=project.id, name="ExperimentA-Run1"
    )
    run2 = UserService().create_virtual_user(
        db=db_session, project_id=project.id, name="ExperimentA-Run2"
    )
    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Claim",
            color="#ff0000",
            description="",
            project_id=project.id,
            is_system=False,
        ),
    )
    sdoc = create_text_document(
        db_session,
        project=project,
        filename="va_doc.txt",
        name="va_doc",
        sentences=SENTENCES,
    )
    run1_alpha = create_span_for_text(
        db_session, sdoc=sdoc, text="Alpha", code_id=code.id, user_id=run1.id
    )
    run1_delta = create_span_for_text(
        db_session, sdoc=sdoc, text="Delta", code_id=code.id, user_id=run1.id
    )
    user_alpha_copy_id = (
        SpanAnnotationService()
        .create(
            db=db_session,
            user_id=test_user.id,
            create_dto=SpanAnnotationCreate(
                sdoc_id=sdoc.id,
                begin=run1_alpha.begin,
                end=run1_alpha.end,
                begin_token=run1_alpha.begin_token,
                end_token=run1_alpha.end_token,
                span_text="Alpha",
                code_id=code.id,
                source_annotation_id=run1_alpha.id,
            ),
        )
        .id
    )

    # 2) another project with its own virtual user
    other_user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            email="other@dats.org",
            first_name="Other",
            last_name="User",
            password="MyOtherPassword123",
        ),
    )
    other_project_read = ProjectService().create_project(
        db=db_session,
        create_dto=ProjectCreate(title="Other Project", description=""),
        creating_user_id=other_user.id,
    )
    other_project = crud_project.read(db=db_session, id=other_project_read.id)
    other_run = UserService().create_virtual_user(
        db=db_session, project_id=other_project.id, name="ExperimentB-Run1"
    )
    other_sdoc = create_text_document(
        db_session,
        project=other_project,
        filename="other_doc.txt",
        name="other_doc",
        sentences=SENTENCES,
    )

    # 3) an empty project to import into
    target_project_read = ProjectService().create_project(
        db=db_session,
        create_dto=ProjectCreate(title="Target Project", description=""),
        creating_user_id=test_user.id,
    )
    target_project = crud_project.read(db=db_session, id=target_project_read.id)
    crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Claim",
            color="#ff0000",
            description="",
            project_id=target_project.id,
            is_system=False,
        ),
    )
    create_text_document(
        db_session,
        project=target_project,
        filename="va_doc.txt",
        name="va_doc",
        sentences=SENTENCES,
    )

    db_session.commit()
    return {
        "project": project,
        "other_project": other_project,
        "target_project": target_project,
        "user": test_user,
        "other_user": other_user,
        "run1": crud_user.read(db=db_session, id=run1.id),
        "run2": crud_user.read(db=db_session, id=run2.id),
        "other_run": crud_user.read(db=db_session, id=other_run.id),
        "code": code,
        "sdoc": sdoc,
        "other_sdoc": other_sdoc,
        "run1_alpha": run1_alpha,
        "run1_delta": run1_delta,
        "user_alpha_copy": crud_span_anno.read(db=db_session, id=user_alpha_copy_id),
    }
