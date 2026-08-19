from typing import TypedDict
from uuid import uuid4

import pytest

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


def _create_memo(
    db_session,
    *,
    project: ProjectORM,
    user: UserORM,
    title: str,
    content: str,
    attached_object_id: int,
    attached_object_type: AttachedObjectType,
) -> MemoORM:
    """Create a memo attached to an object via the memo CRUD (no favorite)."""
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


class MemoProjectState(TypedDict):
    """A deterministic project fixture for memo endpoint tests.

    This fixture sets up the following project:

    - Project: "Simple Test Project" (from the root `test_project` fixture).
    - Users: `user` = the global test_user (Test User, testuser@dats.org),
      `other_user` (Other Author, otherauthor@dats.org). Both are members of
      the project.
    - Code: `code` "Memo Target Code".
    - Tag: `tag` "Memo Target Tag".
    - Document: `sdoc` "Test Document" (from the root `project_with_sdoc`
      fixture), with its data/file on disk. Content: "This is a test document.
      It has two sentences." (2 sentences, 9 tokens).
    - Annotations (all on `sdoc`, all coded with `code`, all authored by `user`):
      - `span_annotation`: span over "This" (chars 0-4, tokens 0-1).
      - `sentence_annotation`: sentence 0.
      - `bbox_annotation`: box (x=0..10, y=0..10).
    - Attachable objects and their memos. Every non-deprecated AttachedObjectType
      carries at least one memo (span_group is deprecated and intentionally not
      covered). Multiple memos per object — and per user per object — are allowed:
      - `code` (AttachedObjectType.code):
        - `code_memo_a` "Code Memo A" by `user`
        - `code_memo_b` "Code Memo B" by `user`   (same user, same object)
        - `code_memo_other` "Other Code Memo" by `other_user`
      - `sdoc` (source_document): `sdoc_memo` "Document Memo" by `user`
      - `span_annotation` (span_annotation): `span_memo` "Span Memo" by `user`
      - `sentence_annotation` (sentence_annotation): `sent_memo` "Sentence Memo" by `user`
      - `bbox_annotation` (bbox_annotation): `bbox_memo` "BBox Memo" by `user`
      - `project` (project): `project_memo` "Project Memo" by `other_user`
      - `tag` (tag): `tag_memo` "Tag Memo" by `user`
    - Favorites (per-user; a favorite is a (memo, user) link, not a flag on the
      memo):
      - `user` favorited `code_memo_a`.
      - `other_user` favorited `code_memo_a` AND `code_memo_b`.

    Non-obvious derived behavior (documented so tests don't re-derive it):
    - `is_favorite` on a MemoRead is computed for the REQUESTING user. Because
      the test client authenticates as `user` (the root `app` fixture overrides
      `get_current_user` to the test_user), a memo read through the API reports
      `is_favorite=True` only for `code_memo_a` — even though `other_user` also
      favorited `code_memo_b`. Favorites are per-user, never global.
    - Existence-vs-authorization ordering differs by endpoint. `get_by_id` and
      the favorite endpoints authorize FIRST (`assert_in_same_project_as`), so
      a nonexistent memo id yields 403. `update_by_id` and `delete_by_id` READ
      the memo first, so a nonexistent memo id yields 404 (NoSuchElementError).
      Create/list resolve the ATTACHED object first, so a nonexistent
      attached-object id yields 404.
    """

    project: ProjectORM
    user: UserORM
    other_user: UserORM
    code: CodeORM
    tag: TagORM
    sdoc: SourceDocumentORM
    span_annotation: SpanAnnotationORM
    sentence_annotation: SentenceAnnotationORM
    bbox_annotation: BBoxAnnotationORM
    code_memo_a: MemoORM
    code_memo_b: MemoORM
    code_memo_other: MemoORM
    sdoc_memo: MemoORM
    span_memo: MemoORM
    sent_memo: MemoORM
    bbox_memo: MemoORM
    project_memo: MemoORM
    tag_memo: MemoORM


@pytest.fixture(scope="function")
def other_user(db_session, test_project) -> UserORM:
    """A second project member, used to exercise per-user favorites and multi-user memos."""
    user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            first_name="Other",
            last_name="Author",
            email="otherauthor@dats.org",
            password="OtherPassword123",
        ),
    )
    # Make the second user a member of the test project.
    test_project.users.append(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def memo_project(
    db_session, test_project, test_user, other_user, project_with_sdoc
) -> MemoProjectState:
    """Build the deterministic memo project described in MemoProjectState."""
    project = test_project
    sdoc = project_with_sdoc["source_document"]

    # A code and a tag to attach memos to.
    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Memo Target Code",
            color="#0000ff",
            description="Code for memo tests",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        ),
    )
    tag = crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="Memo Target Tag",
            color="#ff0000",
            description="Tag for memo tests",
            parent_id=None,
            project_id=project.id,
        ),
    )

    # Annotations on the sdoc (span, sentence, bbox), all coded with `code`.
    span_annotation = crud_span_anno.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=SpanAnnotationCreate(
            begin=0,
            end=4,
            begin_token=0,
            end_token=1,
            span_text="This",
            code_id=code.id,
            sdoc_id=sdoc.id,
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
    bbox_annotation = crud_bbox_anno.create(
        db=db_session,
        user_id=test_user.id,
        create_dto=BBoxAnnotationCreate(
            x_min=0,
            y_min=0,
            x_max=10,
            y_max=10,
            code_id=code.id,
            sdoc_id=sdoc.id,
        ),
    )

    def create_memo(
        user: UserORM, title: str, obj_id: int, obj_type: AttachedObjectType
    ):
        return _create_memo(
            db_session,
            project=project,
            user=user,
            title=title,
            content=f"Content of {title}",
            attached_object_id=obj_id,
            attached_object_type=obj_type,
        )

    # Memos on the code: two by `user` (multiple per user per object), one by
    # `other_user`.
    code_memo_a = create_memo(
        test_user, "Code Memo A", code.id, AttachedObjectType.code
    )
    code_memo_b = create_memo(
        test_user, "Code Memo B", code.id, AttachedObjectType.code
    )
    code_memo_other = create_memo(
        other_user, "Other Code Memo", code.id, AttachedObjectType.code
    )

    # One memo on every other (non-deprecated) attachable object type.
    sdoc_memo = create_memo(
        test_user, "Document Memo", sdoc.id, AttachedObjectType.source_document
    )
    span_memo = create_memo(
        test_user, "Span Memo", span_annotation.id, AttachedObjectType.span_annotation
    )
    sent_memo = create_memo(
        test_user,
        "Sentence Memo",
        sentence_annotation.id,
        AttachedObjectType.sentence_annotation,
    )
    bbox_memo = create_memo(
        test_user, "BBox Memo", bbox_annotation.id, AttachedObjectType.bbox_annotation
    )
    project_memo = create_memo(
        other_user, "Project Memo", project.id, AttachedObjectType.project
    )
    tag_memo = create_memo(test_user, "Tag Memo", tag.id, AttachedObjectType.tag)

    # Per-user favorites: user -> A; other_user -> A and B.
    crud_memo.favorite(db=db_session, memo_id=code_memo_a.id, user_id=test_user.id)
    crud_memo.favorite(db=db_session, memo_id=code_memo_a.id, user_id=other_user.id)
    crud_memo.favorite(db=db_session, memo_id=code_memo_b.id, user_id=other_user.id)

    db_session.commit()
    for obj in (
        project,
        code,
        tag,
        sdoc,
        span_annotation,
        sentence_annotation,
        bbox_annotation,
        code_memo_a,
        code_memo_b,
        code_memo_other,
        sdoc_memo,
        span_memo,
        sent_memo,
        bbox_memo,
        project_memo,
        tag_memo,
    ):
        db_session.refresh(obj)

    return {
        "project": project,
        "user": test_user,
        "other_user": other_user,
        "code": code,
        "tag": tag,
        "sdoc": sdoc,
        "span_annotation": span_annotation,
        "sentence_annotation": sentence_annotation,
        "bbox_annotation": bbox_annotation,
        "code_memo_a": code_memo_a,
        "code_memo_b": code_memo_b,
        "code_memo_other": code_memo_other,
        "sdoc_memo": sdoc_memo,
        "span_memo": span_memo,
        "sent_memo": sent_memo,
        "bbox_memo": bbox_memo,
        "project_memo": project_memo,
        "tag_memo": tag_memo,
    }
