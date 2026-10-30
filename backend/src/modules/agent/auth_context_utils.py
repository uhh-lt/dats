from contextlib import contextmanager
from contextvars import ContextVar
from typing import Generator

import httpx2

# Task-isolated context variable for the auth header of the request an agent runs for
_request_auth_header: ContextVar[str | None] = ContextVar(
    "_request_auth_header", default=None
)


@contextmanager
def auth_header_context(auth_header: str | None) -> Generator[None, None, None]:
    """Makes the agent's tool calls in this context authenticate with `auth_header`."""
    token = _request_auth_header.set(auth_header)
    try:
        yield
    finally:
        _request_auth_header.reset(token)


async def forward_auth_header_hook(request: httpx2.Request) -> None:
    """httpx event hook: adds the auth header of the current context to a tool call."""
    auth = _request_auth_header.get()
    if auth:
        request.headers["authorization"] = auth
