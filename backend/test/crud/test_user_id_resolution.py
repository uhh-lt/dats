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
from repos.db.sql_exceptions import NoSuchElementError
from systems.search_system.abstract_column import AbstractColumns

# ===========================================================================
# USER ID FILTERS: IDS TO EMAILS AND BACK (`*_columns.py`) TESTS
# ===========================================================================
# The export of a filter turns its user ids into emails (`resolve_ids`) and the
# import turns them back (`resolve_names`); both resolve the members and the
# virtual users of the filter's project only.

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
    virtual user of another project answers 404 instead of giving away its
    email."""
    project_id = tenants["own"]["project"].id
    own_virtual_user = tenants["own"]["virtual_user"]

    emails = column.resolve_ids(
        db_session, project_id=project_id, ids=[test_user.id, own_virtual_user.id]
    )
    assert emails == [test_user.email, own_virtual_user.email]

    with pytest.raises(NoSuchElementError):
        column.resolve_ids(
            db_session,
            project_id=project_id,
            ids=[tenants["foreign"]["virtual_user"].id],
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
