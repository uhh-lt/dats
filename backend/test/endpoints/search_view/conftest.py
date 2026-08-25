from typing import Any, Generator, TypedDict

import pytest
from fastapi.testclient import TestClient

from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from modules.search_view.search_view_crud import crud_search_view
from modules.search_view.search_view_dto import (
    BBoxSearchViewCreate,
    MemoSearchViewCreate,
    SearchViewLayout,
    SentenceSearchViewCreate,
    SpanSearchViewCreate,
)
from modules.search_view.search_view_orm import SearchViewORM
from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering import Filter, FilterExpression, LogicalOperator
from systems.search_system.filtering_operators import StringOperator


def string_filter_tree(column: AbstractColumns, value: str) -> Filter:
    """A minimal valid filter tree: one STRING_CONTAINS expression on `column`."""
    return Filter(
        id="root",
        logic_operator=LogicalOperator.and_,
        items=[
            FilterExpression(
                id="expr-1",
                column=column,
                operator=StringOperator.CONTAINS,
                value=value,
            )
        ],
    )


class SearchViewProjectState(TypedDict):
    """A deterministic project fixture for search-view tests.

    This fixture sets up the following project:

    - Project: "Simple Test Project" (from the root `test_project` fixture).
    - User: `user` = the global test_user (Test User, testuser@dats.org), the
      owner of every view.
    - Search views (all TABLE layout, no grouping, no sorts; each has a single
      STRING_CONTAINS filter on a string column of its entity):
      - `memo_view_a` "Memo View A" (memo, position 0), filter: M_TITLE contains "a",
        selected_properties [M_TITLE, M_CREATED]
      - `memo_view_b` "Memo View B" (memo, position 1), filter: M_TITLE contains "b",
        selected_properties None (frontend default)
      - `memo_view_c` "Memo View C" (memo, position 2), filter: M_TITLE contains "c",
        selected_properties None (frontend default)
      - `span_view` "Span View" (span_annotation, position 0), filter:
        SP_SPAN_TEXT contains "span"
      - `sentence_view` "Sentence View" (sentence_annotation, position 0), filter:
        SentAnno_SOURCE_SOURCE_DOCUMENT_NAME contains "sentence"
      - `bbox_view` "BBox View" (bbox_annotation, position 0), filter:
        BB_SOURCE_SOURCE_DOCUMENT_NAME contains "bbox"

    Non-obvious derived behavior:
    - Position is assigned per (project, user, entity_type): the three memo views
      occupy positions 0-2, while the span/sentence/bbox views each start again at
      position 0.
    - The listing endpoint returns views ordered by position, so the memo listing
      is [memo_view_a, memo_view_b, memo_view_c].
    """

    project: ProjectORM
    user: UserORM
    memo_view_a: SearchViewORM
    memo_view_b: SearchViewORM
    memo_view_c: SearchViewORM
    span_view: SearchViewORM
    sentence_view: SearchViewORM
    bbox_view: SearchViewORM


@pytest.fixture(scope="function")
def search_view_project(db_session, test_project, test_user) -> SearchViewProjectState:
    """Create a project for the test user with one saved search view per entity type
    plus two extra memo views (so memo has three views at positions 0-2)."""
    from modules.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
    from modules.search.memo_search.memo_search_columns import MemoColumns
    from modules.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
    from modules.search.span_anno_search.span_anno_search_columns import SpanColumns

    def create_view(create_dto) -> SearchViewORM:
        return crud_search_view.create(
            db=db_session, create_dto=create_dto, user_id=test_user.id
        )

    memo_view_a = create_view(
        MemoSearchViewCreate(
            project_id=test_project.id,
            name="Memo View A",
            layout=SearchViewLayout.TABLE,
            filters=string_filter_tree(MemoColumns.TITLE, "a"),
            sorts=[],
            selected_properties=[MemoColumns.TITLE, MemoColumns.CREATED],
        )
    )
    memo_view_b = create_view(
        MemoSearchViewCreate(
            project_id=test_project.id,
            name="Memo View B",
            layout=SearchViewLayout.TABLE,
            filters=string_filter_tree(MemoColumns.TITLE, "b"),
            sorts=[],
        )
    )
    memo_view_c = create_view(
        MemoSearchViewCreate(
            project_id=test_project.id,
            name="Memo View C",
            layout=SearchViewLayout.TABLE,
            filters=string_filter_tree(MemoColumns.TITLE, "c"),
            sorts=[],
        )
    )
    span_view = create_view(
        SpanSearchViewCreate(
            project_id=test_project.id,
            name="Span View",
            layout=SearchViewLayout.TABLE,
            filters=string_filter_tree(SpanColumns.SPAN_TEXT, "span"),
            sorts=[],
        )
    )
    sentence_view = create_view(
        SentenceSearchViewCreate(
            project_id=test_project.id,
            name="Sentence View",
            layout=SearchViewLayout.TABLE,
            filters=string_filter_tree(
                SentAnnoColumns.SOURCE_DOCUMENT_NAME, "sentence"
            ),
            sorts=[],
        )
    )
    bbox_view = create_view(
        BBoxSearchViewCreate(
            project_id=test_project.id,
            name="BBox View",
            layout=SearchViewLayout.TABLE,
            filters=string_filter_tree(BBoxColumns.SOURCE_DOCUMENT_NAME, "bbox"),
            sorts=[],
        )
    )

    db_session.commit()
    for view in (
        memo_view_a,
        memo_view_b,
        memo_view_c,
        span_view,
        sentence_view,
        bbox_view,
    ):
        db_session.refresh(view)

    return {
        "project": test_project,
        "user": test_user,
        "memo_view_a": memo_view_a,
        "memo_view_b": memo_view_b,
        "memo_view_c": memo_view_c,
        "span_view": span_view,
        "sentence_view": sentence_view,
        "bbox_view": bbox_view,
    }


# ---------------------------------------------------------------------------
# SECOND USERS (for authorization tests)
# ---------------------------------------------------------------------------
# Search views are personal: only the owner may update/delete them, and only
# project members may create/list/reorder them. These fixtures build a second
# project member and a non-member, each with their own app/client (auth is
# overridden per-app via build_app, so a second user needs a second client).


@pytest.fixture(scope="function")
def other_member(db_session, test_project) -> UserORM:
    """A second user who IS a member of the test project (but owns no views)."""
    from core.user.user_crud import crud_user
    from core.user.user_dto import UserCreate

    user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            first_name="Other",
            last_name="Member",
            email="othermember@dats.org",
            password="OtherPassword123",
        ),
    )
    test_project.users.append(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def other_member_client(other_member) -> Generator[TestClient, Any, None]:
    """A client authenticated as `other_member`."""
    import dats_setup_utils

    with TestClient(dats_setup_utils.build_app(other_member)) as c:
        yield c


@pytest.fixture(scope="function")
def non_member(db_session) -> UserORM:
    """A second user who is NOT a member of the test project."""
    from core.user.user_crud import crud_user
    from core.user.user_dto import UserCreate

    user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            first_name="Non",
            last_name="Member",
            email="nonmember@dats.org",
            password="NonPassword123",
        ),
    )
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def non_member_client(non_member) -> Generator[TestClient, Any, None]:
    """A client authenticated as `non_member`."""
    import dats_setup_utils

    with TestClient(dats_setup_utils.build_app(non_member)) as c:
        yield c
