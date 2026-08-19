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
      `code_beta` is a CHILD of `code_alpha` (parent_id = code_alpha.id), so
      CODE CONTAINS_RECURSIVE on Alpha matches both Alpha- and Beta-coded
      annotations, while plain CONTAINS on Alpha matches only Alpha-coded ones.
    - Tags (a hierarchy): `tag` "Important" (#0000ff, parent_id=None) — linked
      to `sdoc_one`; `subtag` "Urgent" (#ff00ff, parent_id = tag.id, a CHILD of
      "Important") — linked to `sdoc_two`.
    - `colliding_tag` "Colliding Tag" (#123456): a tag whose id is FORCED to
      equal `code_alpha.id`. It is NOT linked to any document and has no memo.
      It exists solely so memo attached-object resolution can be tested for
      type-awareness: a (code, id) filter and a (tag, id) filter using this
      shared id must resolve to different names ("Alpha" vs "Colliding Tag").
    - Folders (a hierarchy): `folder` "Research" (NORMAL, parent_id=None) and
      `subfolder` "Archive" (NORMAL, parent_id = folder.id, a CHILD of
      "Research"). `sdoc_two`'s auto-created SDOC_FOLDER is re-parented under
      "Archive", so its NORMAL parent folder is "Archive". `sdoc_one` sits in
      its own auto-created SDOC_FOLDER with parent_id=None (no NORMAL folder).
    - Documents:
      - `sdoc_one` "Test Document" (test_document.txt, text, file on disk):
        content "This is a test document. It has two sentences.", 2 sentences.
        -> linked to tag "Important"; NOT in any NORMAL folder.
      - `sdoc_two` "Second Document" (second_document.txt, text, file on disk):
        content "Alpha beta gamma.", 1 sentence.
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
      tag "Important"; annotations on sdoc_two (sent[1], bbox[1]) contain
      subtag "Urgent". Because "Urgent" is a child of "Important",
      CONTAINS_RECURSIVE on "Important" matches annotations on BOTH sdocs,
      while plain CONTAINS on "Important" matches only sdoc_one's.
    - FOLDER_ID_LIST_RECURSIVE aggregates the NORMAL parent folder of the
      annotation's sdoc: only annotations on sdoc_two (sent[1], bbox[1])
      contain a folder, and that folder is "Archive" (the child), NOT
      "Research". So plain CONTAINS on "Research" matches nothing, while
      CONTAINS_RECURSIVE on "Research" (expanding to {Research, Archive})
      matches sdoc_two's annotations. sdoc_one's annotations contain none.
    - Span texts are "This" and "is" — "is" CONTAINS/ENDS_WITH matches both
      ("This" contains "is"). Use "Thi" for a single-match substring.
    - `colliding_tag.id == code_alpha.id`: memo ATTACHED_OBJECT_ID resolution
      must use the attached-object TYPE token to pick the right table, so the
      same id resolves to "Alpha" (code) or "Colliding Tag" (tag) depending on
      the type. A probe-all-tables first-match implementation would return the
      wrong name for one of them.
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
    subtag: TagORM
    colliding_tag: TagORM
    folder: FolderORM
    subfolder: FolderORM
    memos: list[MemoORM]


def _make_code(
    db_session,
    project: ProjectORM,
    name: str,
    color: str,
    parent_id: int | None = None,
) -> CodeORM:
    return crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name=name,
            color=color,
            description=f"{name} code",
            parent_id=parent_id,
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
# SEED-ONCE / PER-TEST-SESSION OVERRIDES
# ===========================================================================
# All search tests are READ-ONLY: they only ever POST queries to /search/* and
# never mutate data. The database is therefore wiped/seeded ONCE per test
# session and `search_project` is built ONCE, then shared by every test in this
# directory.
#
# To mirror production (where every API request / job opens its own short-lived
# `SQLRepo().transaction()`), the seed phase and the per-test phase use
# SEPARATE sessions:
#
# - `seed_db_session` (session-scoped): a single session used ONLY to build the
#   seed data. Everything it creates is committed immediately, and at the end of
#   `search_project` all returned ORM objects are `expunge_all()`-ed so they are
#   detached-but-fully-loaded (readable in tests without a live session). This
#   session is closed at teardown WITHOUT a final commit (nothing is pending),
#   which avoids holding an idle connection across the whole run.
# - `db_session` (function-scoped): a fresh `SQLRepo().transaction()` per test,
#   exactly like the root conftest and like production.
#
# Pytest resolves a fixture by name from the nearest conftest, so these
# definitions shadow the ones in backend/test/conftest.py for tests in this
# directory only. Other test suites are unaffected.


@pytest.fixture(scope="session", autouse=True)
def setup_repos(init_postgres) -> None:
    """Session-scoped override: wipe/seed external repos once for the search suite."""
    dats_setup_utils.setup_repos()


@pytest.fixture(scope="session")
def seed_db_session(setup_repos) -> Generator[Session, Any, None]:
    """Session-scoped session used ONLY to build the seed data.

    All seed objects are committed during setup; teardown just closes the
    session (no final commit), so no idle connection is held across the run.
    """
    from sqlalchemy.orm import sessionmaker

    from repos.db.sql_repo import SQLRepo

    repo = SQLRepo()
    if repo._engine is None:
        raise RuntimeError("SQLRepo is not connected. Call connect() first.")
    # expire_on_commit=False keeps every attribute loaded after each commit(), so
    # the objects can later be expunge_all()-ed in a fully-loaded (detached but
    # readable) state for the per-test sessions to consume.
    db = sessionmaker(autoflush=False, bind=repo._engine, expire_on_commit=False)()
    try:
        yield db
    finally:
        # search_project closes the session early to release the connection;
        # close() is idempotent, so this is safe even if already closed.
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_weaviate_collections(setup_repos) -> None:
    """Session-scoped override: create Weaviate collections once."""
    dats_setup_utils.create_weaviate_collections()


@pytest.fixture(scope="session", autouse=True)
def setup_users(seed_db_session) -> None:
    """Session-scoped override: create system/demo/assistant users once."""
    dats_setup_utils.create_system_users(seed_db_session)


@pytest.fixture(scope="session")
def test_user(seed_db_session) -> UserORM:
    """Session-scoped override: create the primary test user once."""
    return dats_setup_utils.create_test_user(seed_db_session)


@pytest.fixture(scope="session")
def test_project(seed_db_session, test_user) -> ProjectORM:
    """Session-scoped override: create the test project once."""
    return dats_setup_utils.create_test_project(seed_db_session, test_user)


@pytest.fixture(scope="session")
def project_with_sdoc(seed_db_session, test_project):
    """Session-scoped override: create the first source document once."""
    return dats_setup_utils.create_project_with_sdoc(seed_db_session, test_project)


@pytest.fixture(scope="session")
def app(test_user: UserORM):
    """Session-scoped app: built once. Auth override opens its own per-request
    transaction (see build_app), so no long-lived test session is needed."""
    return dats_setup_utils.build_app(test_user)


@pytest.fixture(scope="session")
def client(app):
    """Session-scoped test client."""
    from fastapi.testclient import TestClient

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def other_user(seed_db_session) -> UserORM:
    """A second user, used to exercise author (USER_ID) grouping/filtering."""
    user = crud_user.create(
        db=seed_db_session,
        create_dto=UserCreate(
            first_name="Other",
            last_name="Author",
            email="otherauthor@dats.org",
            password="OtherPassword123",
        ),
    )
    seed_db_session.commit()
    seed_db_session.refresh(user)
    return user


@pytest.fixture(scope="session")
def search_project(
    seed_db_session, test_project, test_user, other_user, project_with_sdoc
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
        db=seed_db_session,
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
        db=seed_db_session,
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
    # Write the file to disk so endpoints that build file URLs (e.g. bbox) work.
    with open(file_path, "w") as f:
        f.write("Alpha beta gamma.")

    # --- codes (Beta is a CHILD of Alpha, so CONTAINS_RECURSIVE on Alpha also
    # matches Beta-coded annotations) ---
    code_alpha = _make_code(seed_db_session, project, "Alpha", "#ff0000")
    code_beta = _make_code(
        seed_db_session, project, "Beta", "#00ff00", parent_id=code_alpha.id
    )

    # --- tags (a hierarchy: "Urgent" is a CHILD of "Important"). "Important" is
    # linked to sdoc_one, "Urgent" to sdoc_two, so TAG CONTAINS_RECURSIVE on
    # "Important" expands to {Important, Urgent} and matches annotations on BOTH
    # sdocs, while plain CONTAINS on "Important" matches only sdoc_one. ---
    tag = crud_tag.create(
        db=seed_db_session,
        create_dto=TagCreate(
            name="Important",
            color="#0000ff",
            description="Important tag",
            parent_id=None,
            project_id=project.id,
        ),
    )
    subtag = crud_tag.create(
        db=seed_db_session,
        create_dto=TagCreate(
            name="Urgent",
            color="#ff00ff",
            description="Urgent tag",
            parent_id=tag.id,
            project_id=project.id,
        ),
    )
    crud_tag.link_multiple_tags(
        db=seed_db_session, sdoc_ids=[sdoc_one.id], tag_ids=[tag.id]
    )
    crud_tag.link_multiple_tags(
        db=seed_db_session, sdoc_ids=[sdoc_two.id], tag_ids=[subtag.id]
    )

    # --- folders (a hierarchy: "Archive" is a CHILD of "Research"). sdoc_two's
    # auto-created SDOC_FOLDER is re-parented under "Archive", so its NORMAL
    # parent folder is "Archive" (not "Research" directly). Thus FOLDER CONTAINS
    # on "Research" matches nothing, while CONTAINS_RECURSIVE on "Research"
    # expands to {Research, Archive} and matches sdoc_two's annotations. ---
    folder = crud_folder.create(
        db=seed_db_session,
        create_dto=FolderCreate(
            name="Research",
            folder_type=FolderType.NORMAL,
            parent_id=None,
            project_id=project.id,
        ),
    )
    subfolder = crud_folder.create(
        db=seed_db_session,
        create_dto=FolderCreate(
            name="Archive",
            folder_type=FolderType.NORMAL,
            parent_id=folder.id,
            project_id=project.id,
        ),
    )
    seed_db_session.refresh(sdoc_two)
    sdoc_two_folder = sdoc_two.folder
    sdoc_two_folder.parent_id = subfolder.id
    seed_db_session.add(sdoc_two_folder)
    seed_db_session.flush()

    # --- span annotations (2: one per code, both by test_user on sdoc_one) ---
    span_annotations = [
        crud_span_anno.create(
            db=seed_db_session,
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
            db=seed_db_session,
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
            db=seed_db_session,
            user_id=test_user.id,
            create_dto=SentenceAnnotationCreate(
                sentence_id_start=0,
                sentence_id_end=0,
                code_id=code_alpha.id,
                sdoc_id=sdoc_one.id,
            ),
        ),
        crud_sentence_anno.create(
            db=seed_db_session,
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
            db=seed_db_session,
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
            db=seed_db_session,
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
            seed_db_session,
            project=project,
            user=test_user,
            title="Code Memo",
            content="A memo on code Alpha",
            attached_object_id=code_alpha.id,
            attached_object_type=AttachedObjectType.code,
        ),
        _make_memo(
            seed_db_session,
            project=project,
            user=other_user,
            title="Document Memo",
            content="A memo on the first document",
            attached_object_id=sdoc_one.id,
            attached_object_type=AttachedObjectType.source_document,
        ),
        _make_memo(
            seed_db_session,
            project=project,
            user=test_user,
            title="Span Memo",
            content="A memo on a span annotation",
            attached_object_id=span_annotations[0].id,
            attached_object_type=AttachedObjectType.span_annotation,
        ),
        _make_memo(
            seed_db_session,
            project=project,
            user=other_user,
            title="Sentence Memo",
            content="A memo on a sentence annotation",
            attached_object_id=sentence_annotations[0].id,
            attached_object_type=AttachedObjectType.sentence_annotation,
        ),
        _make_memo(
            seed_db_session,
            project=project,
            user=test_user,
            title="BBox Memo",
            content="A memo on a bbox annotation",
            attached_object_id=bbox_annotations[0].id,
            attached_object_type=AttachedObjectType.bbox_annotation,
        ),
        _make_memo(
            seed_db_session,
            project=project,
            user=other_user,
            title="Project Memo",
            content="A memo on the project",
            attached_object_id=project.id,
            attached_object_type=AttachedObjectType.project,
        ),
        _make_memo(
            seed_db_session,
            project=project,
            user=test_user,
            title="Tag Memo",
            content="A memo on a tag",
            attached_object_id=tag.id,
            attached_object_type=AttachedObjectType.tag,
        ),
    ]

    # --- colliding tag: a tag with the SAME id as code_alpha. Used to prove that
    # memo attached-object resolution is type-aware: a (code, id) filter and a
    # (tag, id) filter with the same id must resolve to different names. ---
    colliding_tag = TagORM(
        id=code_alpha.id,
        name="Colliding Tag",
        description="Shares its id with code_alpha",
        color="#123456",
        project_id=project.id,
    )
    seed_db_session.add(colliding_tag)

    seed_db_session.commit()

    # --- split memo dates across two days so date operators are distinguishable ---
    # created/updated use a DB-side server_default (func.now()), so all memos would
    # otherwise share one day and LT/GT/LTE/GTE could not be told apart. Back-date a
    # deterministic subset (the three test_user-authored memos: Code, Span, BBox) to
    # yesterday via a direct UPDATE, leaving the other four (other_user-authored:
    # Document, Sentence, Project, Tag) on today.
    backdated_memo_ids = [memos[0].id, memos[2].id, memos[4].id]  # Code, Span, BBox
    yesterday = memos[0].created - timedelta(days=1)
    seed_db_session.execute(
        update(MemoORM)
        .where(MemoORM.id.in_(backdated_memo_ids))
        .values(created=yesterday, updated=yesterday)
    )
    seed_db_session.commit()

    # The bulk UPDATE above bypasses the ORM identity map, and the seed session
    # uses expire_on_commit=False, so reload the memos to pick up the back-dated
    # created/updated values before detaching.
    for memo in memos:
        seed_db_session.refresh(memo)

    # Detach every seeded object from the seed session in its fully-loaded state.
    # Tests receive these objects and read their attributes (.id, .name, ...) but
    # run in their OWN function-scoped session, so the seed objects must not be
    # bound to the (now-idle) seed session. Because the seed session uses
    # expire_on_commit=False, all attributes are still loaded here, so
    # expunge_all() leaves the objects detached-but-readable.
    seed_db_session.expunge_all()

    # Close the seed session NOW (before any test runs) so its connection is
    # returned to the pool and does not sit idle for the whole test session.
    # All seed objects are already detached, so this is safe.
    seed_db_session.close()

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
        "subtag": subtag,
        "colliding_tag": colliding_tag,
        "folder": folder,
        "subfolder": subfolder,
        "memos": memos,
    }
