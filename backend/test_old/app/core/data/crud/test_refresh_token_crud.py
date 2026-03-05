from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from core.auth.refresh_token_crud import crud_refresh_token
from core.user.user_orm import UserORM


def test_create_and_use_refresh_token(db: Session, user: UserORM) -> None:
    refresh_token = crud_refresh_token.create(db, user.id)

    crud_refresh_token.read_and_verify(db, refresh_token.token)
    crud_refresh_token.revoke(db, refresh_token)

    # Check that token was revoked
    # revoke() should refresh our ORM object so we don't
    # need to re-read it from the DB
    assert refresh_token.revoked_at is not None
    assert refresh_token.revoked_at < datetime.now(UTC)


def test_cant_use_revoked_token(db: Session, user: UserORM) -> None:
    refresh_token = crud_refresh_token.create(db, user.id)
    second_token = crud_refresh_token.create(db, user.id)
    crud_refresh_token.revoke(db, refresh_token)

    # Check that token was revoked
    revoked_token = crud_refresh_token.read_and_verify(db, refresh_token.token)
    assert revoked_token.revoked_at is not None

    # Revocation only takes effect 10 seconds after
    # it was set. To make the test pass, we'll pretend
    # the revocation happened 11 seconds in the past
    revoked_token.revoked_at -= timedelta(seconds=11)

    with pytest.raises(Exception):
        crud_refresh_token.read_and_verify(db, refresh_token.token)

    # Check that second token was also revoked
    revoked_second_token = crud_refresh_token.read_and_verify(db, second_token.token)
    assert revoked_second_token.revoked_at is not None
    assert revoked_second_token.revoked_at < datetime.now(UTC)
