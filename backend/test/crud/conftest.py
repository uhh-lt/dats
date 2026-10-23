from collections.abc import Callable, Iterator
from contextlib import contextmanager
from typing import TypedDict
from uuid import uuid4

import pytest
from sqlalchemy import event
from sqlalchemy.orm import Session

from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_service import SpanAnnotationService
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_group_dto import SpanGroupCreate
from core.annotation.span_group_service import SpanGroupService
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import MemoCreateIntern
from core.memo.memo_enum import AttachedObjectType
from core.project.project_orm import ProjectORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.tag.tag_orm import TagORM
from modules.word_frequency.word_frequency_crud import crud_word_frequency
from modules.word_frequency.word_frequency_dto import WordFrequencyCreate


@contextmanager
def count_queries(db: Session) -> Iterator[Callable[[], int]]:
    """Count the SQL statements the session executes inside the block."""
    count = 0

    def on_execute(*args: object, **kwargs: object) -> None:
        nonlocal count
        count += 1

    engine = db.get_bind()
    event.listen(engine, "before_cursor_execute", on_execute)
    try:
        yield lambda: count
    finally:
        event.remove(engine, "before_cursor_execute", on_execute)


class ProjectWithTags(TypedDict):
    project: ProjectORM
    tags: list[TagORM]


@pytest.fixture(scope="function")
def project_with_tags(db_session, test_project) -> ProjectWithTags:
    """
    This fixture sets up the following project:

    - The test project of the test user.
    - Five root tags (no parent, no description) named "Tag 0" to "Tag 4", created in
      this order with one `create_multi` call. `tags[i]` is "Tag i".

    Non-obvious derived behavior:

    - The tag ids ascend with the names, so reading them in any other order tests
      that the CRUD restores the input order instead of returning id order.
    """
    tags = crud_tag.create_multi(
        db=db_session,
        create_dtos=[
            TagCreate(name=f"Tag {i}", color="#000000", project_id=test_project.id)
            for i in range(5)
        ],
    )
    db_session.commit()

    return {"project": test_project, "tags": tags}


class SdocWithWordFrequencies(TypedDict):
    sdoc_id: int
    words: list[str]


@pytest.fixture(scope="function")
def sdoc_with_word_frequencies(
    db_session, project_with_sdoc
) -> SdocWithWordFrequencies:
    """
    This fixture sets up the following project:

    - The project and source document of `project_with_sdoc`.
    - Four word frequencies of that document, created in this order with one
      `create_multi` call: "crud-alpha" (count 1), "crud-beta" (count 2),
      "crud-gamma" (count 3), "crud-delta" (count 4). `words[i]` has count i + 1.

    Non-obvious derived behavior:

    - Word frequencies have the composite primary key (sdoc_id, word), so their ids
      are `(sdoc_id, word)` tuples.
    """
    sdoc_id = project_with_sdoc["source_document"].id
    words = ["crud-alpha", "crud-beta", "crud-gamma", "crud-delta"]
    crud_word_frequency.create_multi(
        db=db_session,
        create_dtos=[
            WordFrequencyCreate(sdoc_id=sdoc_id, word=word, count=i + 1)
            for i, word in enumerate(words)
        ],
    )
    db_session.commit()

    return {"sdoc_id": sdoc_id, "words": words}


class SdocWithSpanAnnotations(TypedDict):
    sdoc_id: int
    user_id: int
    code_id: int
    span_ids: list[int]


@pytest.fixture(scope="function")
def sdoc_with_span_annotations(
    db_session, project_with_sdoc, test_user
) -> SdocWithSpanAnnotations:
    """
    This fixture sets up the following project:

    - The project and source document of `project_with_sdoc`, and the test user.
    - One code "crud-code".
    - 30 span annotations of the test user on that document with code "crud-code",
      span i covering characters [i, i + 1) with the text "span i" (all texts differ).

    Non-obvious derived behavior:

    - All spans share one annotation document (test user, document), have no span
      groups and no memos.
    """
    project = project_with_sdoc["project"]
    sdoc_id = project_with_sdoc["source_document"].id
    code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="crud-code",
            color="red",
            description="",
            project_id=project.id,
            is_system=False,
        ),
    )
    spans = SpanAnnotationService().create_multi(
        db=db_session,
        user_id=test_user.id,
        create_dtos=[
            SpanAnnotationCreate(
                span_text=f"span {i}",
                begin=i,
                end=i + 1,
                begin_token=i,
                end_token=i + 1,
                code_id=code.id,
                sdoc_id=sdoc_id,
            )
            for i in range(30)
        ],
    )
    db_session.commit()

    return {
        "sdoc_id": sdoc_id,
        "user_id": test_user.id,
        "code_id": code.id,
        "span_ids": [span.id for span in spans],
    }


class SdocWithMemosAndSpanGroup(TypedDict):
    sdoc_id: int
    user_id: int
    project_id: int
    code_id: int
    span_ids: list[int]
    span_group_id: int
    memo_ids: list[int]
    memo_targets: dict[int, tuple[int, AttachedObjectType]]
    favorite_memo_ids: set[int]


@pytest.fixture(scope="function")
def sdoc_with_memos_and_span_group(
    db_session, sdoc_with_span_annotations, test_project
) -> SdocWithMemosAndSpanGroup:
    """
    This fixture sets up the following project:

    - Everything of `sdoc_with_span_annotations` (30 spans "span 0" .. "span 29" of
      the test user with code "crud-code").
    - One span group "crud-group" of the test user on the document, containing all
      30 spans.
    - 34 memos of the test user, titled "memo 0" .. "memo 33":
      - "memo i" (i < 30) is attached to span i,
      - "memo 30" to the span group, "memo 31" to the code "crud-code",
        "memo 32" to the document and "memo 33" to the project.
    - The test user favorited every memo with an even number.

    `memo_ids` lists the memos in this order, `memo_targets` maps each memo id to
    the (id, type) of the object it is attached to.

    Non-obvious derived behavior:

    - Every span has exactly one memo and belongs to the span group, so its
      SpanAnnotationRead has one memo id and the group id.
    """
    sdoc_id = sdoc_with_span_annotations["sdoc_id"]
    user_id = sdoc_with_span_annotations["user_id"]
    code_id = sdoc_with_span_annotations["code_id"]
    span_ids = sdoc_with_span_annotations["span_ids"]

    span_group = SpanGroupService().create(
        db=db_session,
        user_id=user_id,
        create_dto=SpanGroupCreate(name="crud-group", sdoc_id=sdoc_id),
    )
    crud_span_group.link_groups_spans_batch(
        db=db_session, links={span_group.id: span_ids}
    )

    targets: list[tuple[int, AttachedObjectType]] = [
        *((span_id, AttachedObjectType.span_annotation) for span_id in span_ids),
        (span_group.id, AttachedObjectType.span_group),
        (code_id, AttachedObjectType.code),
        (sdoc_id, AttachedObjectType.source_document),
        (test_project.id, AttachedObjectType.project),
    ]
    memos = [
        crud_memo.create_for_attached_object(
            db=db_session,
            attached_object_id=object_id,
            attached_object_type=object_type,
            create_dto=MemoCreateIntern(
                uuid=str(uuid4()),
                title=f"memo {i}",
                content=f"content {i}",
                content_json='{"blocks": []}',
                user_id=user_id,
                project_id=test_project.id,
            ),
        )
        for i, (object_id, object_type) in enumerate(targets)
    ]
    favorite_memo_ids = {memo.id for i, memo in enumerate(memos) if i % 2 == 0}
    crud_memo.favorite_multi(
        db=db_session, memo_ids=list(favorite_memo_ids), user_id=user_id
    )
    db_session.commit()

    return {
        "sdoc_id": sdoc_id,
        "user_id": user_id,
        "project_id": test_project.id,
        "code_id": code_id,
        "span_ids": span_ids,
        "span_group_id": span_group.id,
        "memo_ids": [memo.id for memo in memos],
        "memo_targets": {
            memo.id: target for memo, target in zip(memos, targets, strict=True)
        },
        "favorite_memo_ids": favorite_memo_ids,
    }
