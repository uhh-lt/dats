from datetime import UTC, datetime
from typing import TypedDict

import pytest
from dateutil.relativedelta import relativedelta

from core.auth.api_key_crud import crud_api_key
from core.auth.api_key_orm import ApiKeyORM
from core.auth.security import hash_api_key
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM


class ApiKeyProjectState(TypedDict):
    test_user: UserORM
    user_key_expiring: ApiKeyORM
    user_key_never: ApiKeyORM
    other_user: UserORM
    other_user_key: ApiKeyORM


@pytest.fixture(scope="function")
def api_key_project(db_session, test_user) -> ApiKeyProjectState:
    """This fixture sets up the following project:

    - The primary test user (from the root `test_user` fixture) owns two API keys:
      - "Expiring Key": expires one month after fixture setup
        (`expires_at = now + 1 month`), prefix "dats_expire...".
      - "Never Key": never expires (`expires_at = None`), prefix "dats_never...".
    - A second user "Other User" (email "other@dats.org") owns one API key:
      - "Other User Key": never expires, prefix "dats_other...".

    All keys are created directly via `crud_api_key.create` with deterministic
    sha256 hashes of fixed raw keys ("dats_expire_raw", "dats_never_raw",
    "dats_other_raw"); the raw keys are never usable through the API.

    Non-obvious derived behavior:
    - `GET /api-keys/list` returns only the keys of the requesting user, so the
      test user sees exactly "Expiring Key" and "Never Key"; "Other User Key"
      is invisible to them.
    - `DELETE /api-keys/delete/{key_id}` does not distinguish authorization from
      existence: deleting "Other User Key" as the test user yields 404, exactly
      like deleting a nonexistent id.
    """
    now = datetime.now(UTC)

    user_key_expiring = crud_api_key.create(
        db=db_session,
        user_id=test_user.id,
        name="Expiring Key",
        hashed_key=hash_api_key("dats_expire_raw"),
        prefix="dats_expire...",
        expires_at=now + relativedelta(months=1),
    )
    user_key_never = crud_api_key.create(
        db=db_session,
        user_id=test_user.id,
        name="Never Key",
        hashed_key=hash_api_key("dats_never_raw"),
        prefix="dats_never...",
        expires_at=None,
    )

    other_user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            first_name="Other",
            last_name="User",
            email="other@dats.org",
            password="OtherPassword123",
        ),
    )
    other_user_key = crud_api_key.create(
        db=db_session,
        user_id=other_user.id,
        name="Other User Key",
        hashed_key=hash_api_key("dats_other_raw"),
        prefix="dats_other...",
        expires_at=None,
    )

    db_session.commit()
    db_session.refresh(user_key_expiring)
    db_session.refresh(user_key_never)
    db_session.refresh(other_user)
    db_session.refresh(other_user_key)

    return {
        "test_user": test_user,
        "user_key_expiring": user_key_expiring,
        "user_key_never": user_key_never,
        "other_user": other_user,
        "other_user_key": other_user_key,
    }
