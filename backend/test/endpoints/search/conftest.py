from datetime import timedelta
from typing import Any, Generator, TypedDict
from uuid import uuid4

import pytest
from sqlalchemy import update
from sqlalchemy.orm import Session

import dats_setup_utils
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import BBoxAnnotationCreate
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from core.doc.folder_orm import FolderORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import AttachedObjectType, MemoCreateIntern
from core.memo.memo_orm import MemoORM
from core.project.project_orm import ProjectORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.tag.tag_orm import TagORM
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM


class SearchProjectState(TypedDict):
    """A deterministic project fixture for search tests.

    This fixture sets up the following project:

    - Project: "Simple Test Project" (from the root `test_project` fixture).
    - Users: `user` = the global test_user (Test User, testuser@dats.org),
      `other_user` (Other Author, otherauthor@dats.org).
    - Codes: `code_alpha` "Alpha" (#ff0000), `code_beta` "Beta" (#00ff00).
    - Tags: `tag` "Important" (#0000ff) — linked to `sdoc_one` only.
    - Folders: `folder` "Research" (NORMAL) — contains `sdoc_two` (its
      auto-created SDOC_FOLDER has parent_id = folder.id). `sdoc_one` sits in
      its own auto-created SDOC_FOLDER with parent_id=None (no NORMAL folder).
    - Documents:
      - `sdoc_one` "Test Document" (test_document.txt, text, file on disk):
        content "This is a test document. It has two sentences.", 2 sentences.
        -> linked to tag "Important"; NOT in any NORMAL folder.
      - `sdoc_two` "Second Document" (second_document.txt, text, NO file on
        disk): content "Alpha beta gamma.", 1 sentence.
        -> no tags; inside folder "Research".
    - Span annotations (both on sdoc_one):
      - [0] by `user`, code Alpha, text "This" (chars 0-4)
      - [1] by `other_user`, code Beta, text "is" (chars 5-7)
    - Sentence annotations (sentence 0 each):
      - [0] by `user`, code Alpha, on sdoc_one ("This is a test document.")
      - [1] by `other_user`, code Beta, on sdoc_two ("Alpha beta gamma.")
    - Bbox annotations:
      - [0] by `user`, code Alpha, on sdoc_one (x=0, y=0, w=10, h=10)
      - [1] by `user`, code Beta, on sdoc_two (x=20, y=20, w=20, h=20)
    - Memos (one per attached-object type; [0], [2], [4] back-dated to
      yesterday, the rest today):
      - [0] "Code Memo" by `user` on code_alpha
      - [1] "Document Memo" by `other_user` on sdoc_one
      - [2] "Span Memo" by `user` on span_annotations[0]
      - [3] "Sentence Memo" by `other_user` on sentence_annotations[0]
      - [4] "BBox Memo" by `user` on bbox_annotations[0]
      - [5] "Project Memo" by `other_user` on project
      - [6] "Tag Memo" by `user` on tag

    Non-obvious derived behavior (documented so tests don't re-derive it):
    - Only span[0], sent[0], bbox[0] have a memo attached. For all other
      annotations the memo columns are NULL, and NULL rows match NO string
      operator — not even negative ones like NOT_CONTAINS.
    - TAG_ID_LIST_RECURSIVE aggregates the tags of the annotation's sdoc:
      annotations on sdoc_one (span[0], span[1], sent[0], bbox[0]) contain
      tag "Important"; annotations on sdoc_two (sent[1], bbox[1]) contain none.
    - FOLDER_ID_LIST_RECURSIVE aggregates the NORMAL parent folder of the
      annotation's sdoc: only annotations on sdoc_two (sent[1], bbox[1])
      contain folder "Research"; sdoc_one's annotations contain none.
    - sdoc_two has no file on disk (only sdoc_one's file is written). Endpoints
      that build file URLs for sdoc_two rows may fail; avoid depending on them.
    - Span texts are "This" and "is" — "is" CONTAINS/ENDS_WITH matches both
      ("This" contains "is"). Use "Thi" for a single-match substring.
    """

    project: ProjectORM
    user: UserORM
    other_user: UserORM
    code_alpha: CodeORM
    code_beta: CodeORM
    sdoc_one: SourceDocumentORM
    sdoc_two: SourceDocumentORM
    span_annotations: list[SpanAnnotationORM]
    sentence_annotations: list[SentenceAnnotationORM]
    bbox_annotations: list[BBoxAnnotationORM]
    tag: TagORM
    folder: FolderORM
    memos: list[MemoORM]


def _make_code(db_session, project: ProjectORM, name: str, color: str) -> CodeORM:
    return crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name=name,
            color=color,
            description=f"{name} code",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        ),
    )


def _make_memo(
    db_session,
    *,
    project: ProjectORM,
    user: UserORM,
    title: str,
    content: str,
    attached_object_id: int,
    attached_object_type: AttachedObjectType,
) -> MemoORM:
    return crud_memo.create_for_attached_object(
        db=db_session,
        attached_object_id=attached_object_id,
        attached_object_type=attached_object_type,
        create_dto=MemoCreateIntern(
            uuid=str(uuid4()),
            title=title,
            content=content,
            content_json='{"blocks": []}',
            user_id=user.id,
            project_id=project.id,
        ),
    )


# ===========================================================================
# SESSION-SCOPED OVERRIDES (read-only search suite performance)
# ===========================================================================
# All search tests are READ-ONLY: they only ever POST queries to /search/* and
# never mutate data. The root conftest therefore does not need to wipe and
# rebuild the entire database between every single search test. To avoid that
# cost we override the relevant fixtures here with `scope="session"` so the
# database is wiped/seeded ONCE and `search_project` is built ONCE, then shared
# by every test in this directory.
#
# Pytest resolves a fixture by name from the nearest conftest, so these
# session-scoped definitions shadow the function-scoped ones in
# backend/test/conftest.py for tests in this directory only. Other test suites
# are unaffected.
#
# Constraint: a session-scoped fixture may only depend on other session-scoped
# (or broader) fixtures, so the whole chain below is session-scoped.


@pytest.fixture(scope="session", autouse=True)
def setup_repos(init_postgres) -> None:
    """Session-scoped override: wipe/seed external repos once for the search suite."""
    dats_setup_utils.setup_repos()


@pytest.fixture(scope="session")
def db_session(setup_repos) -> Generator[Session, Any, None]:
    """Session-scoped override: a single DB session shared by the search suite."""
    from repos.db.sql_repo import SQLRepo

    with SQLRepo().transaction() as db:
        yield db


@pytest.fixture(scope="session", autouse=True)
def setup_weaviate_collections(setup_repos) -> None:
    """Session-scoped override: create Weaviate collections once."""
    dats_setup_utils.create_weaviate_collections()


@pytest.fixture(scope="session", autouse=True)
def setup_users(db_session) -> None:
    """Session-scoped override: create system/demo/assistant users once."""
    dats_setup_utils.create_system_users(db_session)


@pytest.fixture(scope="session")
def test_user(db_session) -> UserORM:
    """Session-scoped override: create the primary test user once."""
    return dats_setup_utils.create_test_user(db_session)


@pytest.fixture(scope="session")
def test_project(db_session, test_user) -> ProjectORM:
    """Session-scoped override: create the test project once."""
    return dats_setup_utils.create_test_project(db_session, test_user)


@pytest.fixture(scope="session")
def project_with_sdoc(db_session, test_project):
    """Session-scoped override: create the first source document once."""
    return dats_setup_utils.create_project_with_sdoc(db_session, test_project)


@pytest.fixture(scope="session")
def app(db_session: Session, test_user: UserORM):
    """Session-scoped override: build the FastAPI app once for the search suite."""
    return dats_setup_utils.build_app(db_session, test_user)


@pytest.fixture(scope="session")
def client(app):
    """Session-scoped override: a single test client for the search suite."""
    from fastapi.testclient import TestClient

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def other_user(db_session) -> UserORM:
    """A second user, used to exercise author (USER_ID) grouping/filtering."""
    user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            first_name="Other",
            last_name="Author",
            email="otherauthor@dats.org",
            password="OtherPassword123",
        ),
    )
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="session")
def search_project(
    db_session, test_project, test_user, other_user, project_with_sdoc
) -> SearchProjectState:
    """Build a deterministic project exercising every searchable entity.

    Note: `project_with_sdoc` already creates one text sdoc ("Test Document") in
    `test_project`; we reuse it as `sdoc_one` and add a second sdoc plus codes,
    annotations, and memos.
    """
    project = test_project
    sdoc_one = project_with_sdoc["source_document"]

    # --- second source document ---
    from common.doc_type import DocType
    from core.doc.source_document_crud import crud_sdoc
    from core.doc.source_document_data_crud import crud_sdoc_data
    from core.doc.source_document_data_dto import SourceDocumentDataCreate
    from core.doc.source_document_dto import SourceDocumentCreate
    from repos.filesystem_repo import FilesystemRepo

    sdoc_two = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="second_document.txt",
            name="Second Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        ),
    )
    file_path = FilesystemRepo()._get_dst_path_for_project_sdoc_file(
        proj_id=project.id, filename=sdoc_two.filename
    )
    relative_file_path = file_path.relative_to(FilesystemRepo().root_dir)
    crud_sdoc_data.create(
        db=db_session,
        create_dto=SourceDocumentDataCreate(
            id=sdoc_two.id,
            content="Alpha beta gamma.",
            repo_url=str(relative_file_path),
            raw_html="<p>Alpha beta gamma.</p>",
            html="<p><sent>Alpha beta gamma.</sent></p>",
            token_starts=[0, 6, 11],
            token_ends=[5, 10, 16],
            sentence_starts=[0],
            sentence_ends=[17],
            token_time_starts=None,
            token_time_ends=None,
        ),
    )

    # --- codes ---
    code_alpha = _make_code(db_session, project, "Alpha", "#ff0000")
    code_beta = _make_code(db_session, project, "Beta", "#00ff00")

    # --- tag (linked to sdoc_one only, so TAG filters have a positive and a
    # negative case) ---
    tag = crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="Important",
            color="#0000ff",
            description="Important tag",
            parent_id=None,
            project_id=project.id,
        ),
    )
    crud_tag.link_multiple_tags(db=db_session, sdoc_ids=[sdoc_one.id], tag_ids=[tag.id])

    # --- folder (a NORMAL folder containing sdoc_two, so FOLDER filters have a
    # positive and a negative case). sdoc_two's auto-created SDOC_FOLDER is
    # re-parented under it; the FOLDER aggregate exposes that NORMAL parent. ---
    folder = crud_folder.create(
        db=db_session,
        create_dto=FolderCreate(
            name="Research",
            folder_type=FolderType.NORMAL,
            parent_id=None,
            project_id=project.id,
        ),
    )
    db_session.refresh(sdoc_two)
    sdoc_two_folder = sdoc_two.folder
    sdoc_two_folder.parent_id = folder.id
    db_session.add(sdoc_two_folder)
    db_session.flush()

    # --- span annotations (2: one per code, both by test_user on sdoc_one) ---
    span_annotations = [
        crud_span_anno.create(
            db=db_session,
            user_id=test_user.id,
            create_dto=SpanAnnotationCreate(
                begin=0,
                end=4,
                begin_token=0,
                end_token=1,
                span_text="This",
                code_id=code_alpha.id,
                sdoc_id=sdoc_one.id,
            ),
        ),
        crud_span_anno.create(
            db=db_session,
            user_id=other_user.id,
            create_dto=SpanAnnotationCreate(
                begin=5,
                end=7,
                begin_token=1,
                end_token=2,
                span_text="is",
                code_id=code_beta.id,
                sdoc_id=sdoc_one.id,
            ),
        ),
    ]

    # --- sentence annotations (2: one per code/user) ---
    sentence_annotations = [
        crud_sentence_anno.create(
            db=db_session,
            user_id=test_user.id,
            create_dto=SentenceAnnotationCreate(
                sentence_id_start=0,
                sentence_id_end=0,
                code_id=code_alpha.id,
                sdoc_id=sdoc_one.id,
            ),
        ),
        crud_sentence_anno.create(
            db=db_session,
            user_id=other_user.id,
            create_dto=SentenceAnnotationCreate(
                sentence_id_start=0,
                sentence_id_end=0,
                code_id=code_beta.id,
                sdoc_id=sdoc_two.id,
            ),
        ),
    ]

    # --- bbox annotations (2: one per code, both by test_user) ---
    bbox_annotations = [
        crud_bbox_anno.create(
            db=db_session,
            user_id=test_user.id,
            create_dto=BBoxAnnotationCreate(
                x_min=0,
                y_min=0,
                x_max=10,
                y_max=10,
                code_id=code_alpha.id,
                sdoc_id=sdoc_one.id,
            ),
        ),
        crud_bbox_anno.create(
            db=db_session,
            user_id=test_user.id,
            create_dto=BBoxAnnotationCreate(
                x_min=20,
                y_min=20,
                x_max=40,
                y_max=40,
                code_id=code_beta.id,
                sdoc_id=sdoc_two.id,
            ),
        ),
    ]

    # --- memos: one per (non-deprecated) attached-object type ---
    # AttachedObjectType.span_group is deprecated and intentionally not covered.
    memos = [
        _make_memo(
            db_session,
            project=project,
            user=test_user,
            title="Code Memo",
            content="A memo on code Alpha",
            attached_object_id=code_alpha.id,
            attached_object_type=AttachedObjectType.code,
        ),
        _make_memo(
            db_session,
            project=project,
            user=other_user,
            title="Document Memo",
            content="A memo on the first document",
            attached_object_id=sdoc_one.id,
            attached_object_type=AttachedObjectType.source_document,
        ),
        _make_memo(
            db_session,
            project=project,
            user=test_user,
            title="Span Memo",
            content="A memo on a span annotation",
            attached_object_id=span_annotations[0].id,
            attached_object_type=AttachedObjectType.span_annotation,
        ),
        _make_memo(
            db_session,
            project=project,
            user=other_user,
            title="Sentence Memo",
            content="A memo on a sentence annotation",
            attached_object_id=sentence_annotations[0].id,
            attached_object_type=AttachedObjectType.sentence_annotation,
        ),
        _make_memo(
            db_session,
            project=project,
            user=test_user,
            title="BBox Memo",
            content="A memo on a bbox annotation",
            attached_object_id=bbox_annotations[0].id,
            attached_object_type=AttachedObjectType.bbox_annotation,
        ),
        _make_memo(
            db_session,
            project=project,
            user=other_user,
            title="Project Memo",
            content="A memo on the project",
            attached_object_id=project.id,
            attached_object_type=AttachedObjectType.project,
        ),
        _make_memo(
            db_session,
            project=project,
            user=test_user,
            title="Tag Memo",
            content="A memo on a tag",
            attached_object_id=tag.id,
            attached_object_type=AttachedObjectType.tag,
        ),
    ]

    db_session.commit()

    # --- split memo dates across two days so date operators are distinguishable ---
    # created/updated use a DB-side server_default (func.now()), so all memos would
    # otherwise share one day and LT/GT/LTE/GTE could not be told apart. Back-date a
    # deterministic subset (the three test_user-authored memos: Code, Span, BBox) to
    # yesterday via a direct UPDATE, leaving the other four (other_user-authored:
    # Document, Sentence, Project, Tag) on today.
    backdated_memo_ids = [memos[0].id, memos[2].id, memos[4].id]  # Code, Span, BBox
    yesterday = memos[0].created - timedelta(days=1)
    db_session.execute(
        update(MemoORM)
        .where(MemoORM.id.in_(backdated_memo_ids))
        .values(created=yesterday, updated=yesterday)
    )
    db_session.commit()

    db_session.refresh(project)
    for obj in [
        sdoc_one,
        sdoc_two,
        code_alpha,
        code_beta,
        tag,
        folder,
        *span_annotations,
        *sentence_annotations,
        *bbox_annotations,
        *memos,
    ]:
        db_session.refresh(obj)

    return {
        "project": project,
        "user": test_user,
        "other_user": other_user,
        "code_alpha": code_alpha,
        "code_beta": code_beta,
        "sdoc_one": sdoc_one,
        "sdoc_two": sdoc_two,
        "span_annotations": span_annotations,
        "sentence_annotations": sentence_annotations,
        "bbox_annotations": bbox_annotations,
        "tag": tag,
        "folder": folder,
        "memos": memos,
    }
