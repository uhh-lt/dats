"""Span group Read DTOs are built with a constant number of queries (no N+1)."""

from sqlalchemy.orm import Session

from core.annotation.span_group_service import SpanGroupService

from .conftest import SdocWithMemosAndSpanGroup, count_queries

# The span groups and their annotation documents, the span ids of the groups, and
# the spans with their eager-loaded relationships. Building the spans through the
# span_annotations relationship needed about four queries per span, i.e. over 100
# for the 30 spans of the fixture group.
MAX_READ_QUERIES = 10


def test_read_with_annotations_by_user_and_sdoc_uses_constant_queries(
    db_session: Session, sdoc_with_memos_and_span_group: SdocWithMemosAndSpanGroup
) -> None:
    """The spans of the groups are read through crud_span_anno's eager loading."""
    fixture = sdoc_with_memos_and_span_group
    db_session.expire_all()

    with count_queries(db_session) as queries:
        groups = SpanGroupService().read_with_annotations_by_user_and_sdoc(
            db=db_session, user_id=fixture["user_id"], sdoc_id=fixture["sdoc_id"]
        )

    assert [group.id for group in groups] == [fixture["span_group_id"]]
    [group] = groups
    assert (group.user_id, group.sdoc_id) == (fixture["user_id"], fixture["sdoc_id"])
    assert [span.id for span in group.span_annotations] == fixture["span_ids"]
    assert all(
        span.group_ids == [fixture["span_group_id"]] and len(span.memo_ids) == 1
        for span in group.span_annotations
    )
    assert queries() <= MAX_READ_QUERIES


def test_read_annotations_uses_constant_queries(
    db_session: Session, sdoc_with_memos_and_span_group: SdocWithMemosAndSpanGroup
) -> None:
    """The spans of one group are read through crud_span_anno's eager loading."""
    fixture = sdoc_with_memos_and_span_group
    db_session.expire_all()

    with count_queries(db_session) as queries:
        spans = SpanGroupService().read_annotations(
            db=db_session, id=fixture["span_group_id"]
        )

    assert [span.id for span in spans] == fixture["span_ids"]
    assert all(span.text == f"span {i}" for i, span in enumerate(spans))
    assert queries() <= MAX_READ_QUERIES
