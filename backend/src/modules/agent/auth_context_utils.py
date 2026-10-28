from contextvars import ContextVar
from typing import Optional

# Task-isolated context variable for the active auth header
_request_auth_header: ContextVar[Optional[str]] = ContextVar(
    "_request_auth_header", default=None
)


def set_auth_header(auth_header: Optional[str]):
    return _request_auth_header.set(auth_header)


def reset_auth_header(token):
    _request_auth_header.reset(token)


async def forward_auth_header_hook(request):
    auth = _request_auth_header.get()
    if auth:
        request.headers["authorization"] = auth
