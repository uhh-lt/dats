"""Copying annotations (with their memos) takes a constant number of queries."""

from sqlalchemy.orm import Session

from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_service import SpanAnnotationService

from .conftest import SdocWithMemosAndSpanGroup, count_queries


def _copy_spans(
    db: Session, fixture: SdocWithMemosAndSpanGroup, span_ids: list[int]
) -> int:
    """Copy the spans (span i covers [i, i + 1)) and return the query count."""
    db.expire_all()
    with count_queries(db) as queries:
        copies = SpanAnnotationService().create_multi(
            db=db,
            user_id=fixture["user_id"],
            create_dtos=[
                SpanAnnotationCreate(
                    span_text=f"span {i}",
                    begin=i,
                    end=i + 1,
                    begin_token=i,
                    end_token=i + 1,
                    code_id=fixture["code_id"],
                    sdoc_id=fixture["sdoc_id"],
                    source_annotation_id=span_id,
                )
                for i, span_id in enumerate(span_ids)
            ],
        )
    assert [copy.source_annotation_id for copy in copies] == span_ids
    assert all(len(copy.memo_ids) == 1 for copy in copies)
    return queries()


def test_service_create_multi_copies_use_constant_queries(
    db_session: Session, sdoc_with_memos_and_span_group: SdocWithMemosAndSpanGroup
) -> None:
    """Copying 30 spans with one memo each takes as many queries as copying one: the
    sources, the memo copies and their object handles are read and written in bulk."""
    span_ids = sdoc_with_memos_and_span_group["span_ids"]

    one_copy_queries = _copy_spans(
        db_session, sdoc_with_memos_and_span_group, span_ids[:1]
    )
    all_copies_queries = _copy_spans(
        db_session, sdoc_with_memos_and_span_group, span_ids
    )

    assert all_copies_queries == one_copy_queries
