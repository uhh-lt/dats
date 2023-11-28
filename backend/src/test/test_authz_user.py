from typing import Optional

import pytest
from fastapi import Request
from httpx import Headers

from app.core.authorization.authz_user import AuthzUser, ForbiddenError
from app.core.data.crud.user import crud_user
from app.core.db.sql_service import SQLService


def test_assert_true(user: int, session: SQLService):
    with session.db_session() as db:
        user_orm = crud_user.read(db, user)
        authz_user = AuthzUser()
        authz_user.request = mock_request()
        authz_user.user = user_orm
        authz_user.db = db

        # This should do nothing
        authz_user.assert_true(True, "")
        with pytest.raises(ForbiddenError):
            authz_user.assert_true(False, "")


def mock_request(
    method: str = "GET",
    server: str = "www.example.com",
    path: str = "/",
    headers: Optional[dict] = None,
    body: Optional[bytes] = None,
) -> Request:
    if headers is None:
        headers = {}
    request = Request(
        {
            "type": "http",
            "path": path,
            "headers": Headers(headers).raw,
            "http_version": "1.1",
            "method": method,
            "scheme": "https",
            "client": ("127.0.0.1", 8080),
            "server": (server, 443),
        }
    )
    if body:

        async def request_body():
            return body

        request.body = request_body
    return request
