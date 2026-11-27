import pytest
from sqlalchemy.orm import Session

from composite_keys_test_utils import TwoTenants
from core.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from core.search.memo_search.memo_search_columns import MemoColumns
from core.search.sdoc_search.sdoc_search_columns import SdocColumns
from core.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
from core.search.span_anno_search.span_anno_search_columns import SpanColumns
from core.user.user_orm import UserORM
from modules.word_frequency.word_frequency_columns import WordFrequencyColumns
from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering import Filter, FilterExpression, LogicalOperator
from systems.search_system.filtering_operators import IDListOperator, IDOperator

# ===========================================================================
# USER ID FILTERS: IDS TO EMAILS AND BACK (`*_columns.py`) TESTS
# ===========================================================================
# The export of a filter turns its user ids into emails (`resolve_ids`) and the
# import turns them back (`resolve_names`); both resolve the users with rows in
# the filter's project only: its members and its virtual users. An id of anyone
# else (a removed member, a user of another project) resolves to nothing.

USER_COLUMNS = [
    # the annotators of a document
    pytest.param(SdocColumns.USER_ID_LIST, id="sdoc"),
    # the author of a memo
    pytest.param(MemoColumns.USER_ID, id="memo"),
    # the annotator of a span annotation
    pytest.param(SpanColumns.USER_ID, id="span"),
    # the annotator of a sentence annotation
    pytest.param(SentAnnoColumns.USER_ID, id="sentence"),
    # the annotator of a bbox annotation
    pytest.param(BBoxColumns.USER_ID, id="bbox"),
    # the annotators of a document in the word frequencies
    pytest.param(WordFrequencyColumns.USER_ID_LIST, id="word-frequency"),
]


@pytest.mark.parametrize("column", USER_COLUMNS)
def test_user_ids_resolve_to_the_emails_of_the_project_users(
    db_session: Session,
    tenants: TwoTenants,
    test_user: UserORM,
    column: AbstractColumns,
) -> None:
    """A member and a virtual user of the project resolve to their emails; the
    virtual user of another project resolves to nothing instead of giving away
    its email."""
    project_id = tenants["own"]["project"].id
    own_virtual_user = tenants["own"]["virtual_user"]

    emails = column.resolve_ids(
        db_session, project_id=project_id, ids=[test_user.id, own_virtual_user.id]
    )
    assert emails == [test_user.email, own_virtual_user.email]

    assert (
        column.resolve_ids(
            db_session,
            project_id=project_id,
            ids=[tenants["foreign"]["virtual_user"].id],
        )
        == []
    )


@pytest.mark.parametrize("column", USER_COLUMNS)
def test_user_emails_resolve_to_the_ids_of_the_project_users(
    db_session: Session,
    tenants: TwoTenants,
    test_user: UserORM,
    column: AbstractColumns,
) -> None:
    """The emails of a member and a virtual user of the project resolve to their
    ids; the email of the virtual user of another project matches nothing."""
    project_id = tenants["own"]["project"].id
    own_virtual_user = tenants["own"]["virtual_user"]

    ids = column.resolve_names(
        db_session,
        project_id=project_id,
        names=[
            test_user.email,
            own_virtual_user.email,
            tenants["foreign"]["virtual_user"].email,
        ],
    )

    assert ids == [test_user.id, own_virtual_user.id]


def test_a_filter_on_a_removed_member_exports_without_that_member(
    db_session: Session, tenants_with_former_member, test_user: UserORM
) -> None:
    """The export of a saved filter does not fail when it names a removed member
    (who keeps annotations in the project): its conditions are left out, the
    other conditions are exported with names; a user of another project
    resolves to nothing as well."""
    tenants = tenants_with_former_member["tenants"]
    project_id = tenants["own"]["project"].id
    former_member = tenants_with_former_member["former_member"]
    user = test_user
    single = Filter[SpanColumns](
        id="root",
        logic_operator=LogicalOperator.and_,
        items=[
            FilterExpression[SpanColumns](
                id="former",
                column=SpanColumns.USER_ID,
                operator=IDOperator.EQUALS,
                value=former_member.id,
            ),
            FilterExpression[SpanColumns](
                id="user",
                column=SpanColumns.USER_ID,
                operator=IDOperator.EQUALS,
                value=user.id,
            ),
        ],
    )
    listed = Filter[SdocColumns](
        id="root",
        logic_operator=LogicalOperator.and_,
        items=[
            FilterExpression[SdocColumns](
                id="former",
                column=SdocColumns.USER_ID_LIST,
                operator=IDListOperator.CONTAINS,
                value=former_member.id,
            ),
            FilterExpression[SdocColumns](
                id="user",
                column=SdocColumns.USER_ID_LIST,
                operator=IDListOperator.CONTAINS,
                value=user.id,
            ),
        ],
    )

    exported_single = Filter.resolve_ids(single, db=db_session, project_id=project_id)
    exported_list = Filter.resolve_ids(listed, db=db_session, project_id=project_id)

    assert len(exported_single.items) == len(exported_list.items) == 1

    assert [
        (item.id, item.value)
        for item in exported_single.items
        if isinstance(item, FilterExpression)
    ] == [("user", user.email)]
    assert [
        (item.id, item.value)
        for item in exported_list.items
        if isinstance(item, FilterExpression)
    ] == [("user", [user.email])]
    assert (
        SpanColumns.USER_ID.resolve_ids(
            db_session,
            project_id=project_id,
            ids=[tenants["foreign"]["virtual_user"].id],
        )
        == []
    )
