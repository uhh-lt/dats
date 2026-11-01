"""Creating memos in bulk takes a constant number of queries."""

from uuid import uuid4

from sqlalchemy.orm import Session

from core.memo.memo_dto import MemoCreateIntern, MemoRead
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_service import MemoService

from .conftest import SdocWithSpanAnnotations, count_queries


def _create_memos(
    db: Session, fixture: SdocWithSpanAnnotations, span_ids: list[int]
) -> tuple[list[MemoRead], int]:
    """Attach one memo "memo of span i" to every span; return them and the query count."""
    db.expire_all()
    with count_queries(db) as queries:
        memos = MemoService().create_multi_for_attached_objects(
            db=db,
            attached_object_type=AttachedObjectType.span_annotation,
            attached_object_ids=span_ids,
            create_dtos=[
                MemoCreateIntern(
                    uuid=str(uuid4()),
                    title=f"memo of span {i}",
                    content=f"content {i}",
                    content_json="[]",
                    user_id=fixture["user_id"],
                    project_id=fixture["project_id"],
                )
                for i in range(len(span_ids))
            ],
        )
    return memos, queries()


def test_service_create_multi_for_attached_objects_uses_constant_queries(
    db_session: Session, sdoc_with_span_annotations: SdocWithSpanAnnotations
) -> None:
    """Attaching 29 memos to 29 spans takes as many queries as attaching one: the
    object handles and the memos are written in bulk. The memos keep the order of
    the input, their author and their attached span."""
    fixture = sdoc_with_span_annotations
    span_ids = fixture["span_ids"]

    _, one_memo_queries = _create_memos(db_session, fixture, span_ids[:1])
    memos, all_memos_queries = _create_memos(db_session, fixture, span_ids[1:])

    assert all_memos_queries == one_memo_queries
    assert [memo.title for memo in memos] == [
        f"memo of span {i}" for i in range(len(span_ids) - 1)
    ]
    assert [memo.attached_object_id for memo in memos] == span_ids[1:]
    assert all(
        memo.attached_object_type == AttachedObjectType.span_annotation
        and memo.user_id == fixture["user_id"]
        for memo in memos
    )
