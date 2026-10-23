"""Memo Read DTOs are built with a constant number of queries (no N+1)."""

from sqlalchemy.orm import Session

from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import MemoRead, MemoUpdateBulk
from core.memo.memo_service import MemoService
from core.memo.memo_utils import get_memo_read_dtos_from_orms

from .conftest import SdocWithMemosAndSpanGroup, count_queries

# The memos, their object handles and the favorites of the user. Resolving the
# attached object and the favorite per memo needed at least two queries per memo,
# i.e. over 60 for the 34 fixture memos.
MAX_READ_QUERIES = 4


def _assert_memos_match_fixture(
    dtos: list[MemoRead], fixture: SdocWithMemosAndSpanGroup
) -> None:
    for dto in dtos:
        assert (dto.attached_object_id, dto.attached_object_type) == fixture[
            "memo_targets"
        ][dto.id]
        assert dto.is_favorite == (dto.id in fixture["favorite_memo_ids"])


def test_read_by_ids_dtos_use_constant_queries(
    db_session: Session, sdoc_with_memos_and_span_group: SdocWithMemosAndSpanGroup
) -> None:
    """crud_memo.read_by_ids eager-loads what the batched DTO builder reads."""
    fixture = sdoc_with_memos_and_span_group
    ids = fixture["memo_ids"][::-1]
    db_session.expire_all()

    with count_queries(db_session) as queries:
        dtos = get_memo_read_dtos_from_orms(
            db=db_session,
            db_objs=crud_memo.read_by_ids(db=db_session, ids=ids),
            user_id=fixture["user_id"],
        )

    assert [dto.id for dto in dtos] == ids
    _assert_memos_match_fixture(dtos, fixture)
    assert queries() <= MAX_READ_QUERIES


def test_read_by_project_dtos_use_constant_queries(
    db_session: Session, sdoc_with_memos_and_span_group: SdocWithMemosAndSpanGroup
) -> None:
    """A custom read method of crud_memo applies the eager-load options, too."""
    fixture = sdoc_with_memos_and_span_group
    db_session.expire_all()

    with count_queries(db_session) as queries:
        dtos = get_memo_read_dtos_from_orms(
            db=db_session,
            db_objs=crud_memo.read_by_project(
                db=db_session, project_id=fixture["project_id"]
            ),
            user_id=fixture["user_id"],
        )

    assert {dto.id for dto in dtos} == set(fixture["memo_ids"])
    _assert_memos_match_fixture(dtos, fixture)
    assert queries() <= MAX_READ_QUERIES


def test_service_update_multi_dtos_use_constant_queries(
    db_session: Session, sdoc_with_memos_and_span_group: SdocWithMemosAndSpanGroup
) -> None:
    """Favoriting and retitling every memo returns DTOs from one eager re-read."""
    fixture = sdoc_with_memos_and_span_group
    ids = fixture["memo_ids"]
    db_session.expire_all()

    with count_queries(db_session) as queries:
        dtos = MemoService().update_multi(
            db=db_session,
            user_id=fixture["user_id"],
            update_dtos=[
                MemoUpdateBulk(memo_id=id, title=f"new {id}", is_favorite=True)
                for id in ids
            ],
        )

    assert [dto.id for dto in dtos] == ids
    assert all(dto.is_favorite for dto in dtos)
    assert [dto.title for dto in dtos] == [f"new {id}" for id in ids]
    # favorite + update (read + UPDATE) + the eager re-read for the DTOs
    assert queries() <= MAX_READ_QUERIES + 6


def test_service_delete_multi_dtos_use_constant_queries(
    db_session: Session, sdoc_with_memos_and_span_group: SdocWithMemosAndSpanGroup
) -> None:
    """The snapshot of the deleted memos is built from one eager read."""
    fixture = sdoc_with_memos_and_span_group
    ids = fixture["memo_ids"]
    db_session.expire_all()

    with count_queries(db_session) as queries:
        dtos = MemoService().delete_multi(
            db=db_session, user_id=fixture["user_id"], ids=ids
        )

    assert [dto.id for dto in dtos] == ids
    _assert_memos_match_fixture(dtos, fixture)
    # the eager read for the DTOs + the delete
    assert queries() <= MAX_READ_QUERIES + 4
