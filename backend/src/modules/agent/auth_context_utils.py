from collections.abc import Generator, Mapping
from contextlib import contextmanager
from contextvars import ContextVar

import httpx2

# The request headers that authenticate an agent's tool calls. The tests add
# the header their test clients authenticate with.
FORWARDED_HEADERS: tuple[str, ...] = ("authorization",)

# The auth headers of the request an agent run belongs to. Each run uses its own
# MCP toolset, which starts its MCP server task when it connects inside the run,
# so the task (and every tool call it makes) inherits this run's value.
_request_auth_headers: ContextVar[dict[str, str]] = ContextVar(
    "_request_auth_headers", default={}
)


def forwarded_auth_headers(headers: Mapping[str, str]) -> dict[str, str]:
    """The headers of a request that authenticate its agent's tool calls."""
    return {name: headers[name] for name in FORWARDED_HEADERS if name in headers}


@contextmanager
def auth_headers_context(auth_headers: dict[str, str]) -> Generator[None, None, None]:
    """Makes the agent's tool calls in this context authenticate with `auth_headers`."""
    token = _request_auth_headers.set(auth_headers)
    try:
        yield
    finally:
        _request_auth_headers.reset(token)


async def forward_auth_headers_hook(request: httpx2.Request) -> None:
    """httpx event hook: adds the auth headers of the current context to a tool call."""
    for name, value in _request_auth_headers.get().items():
        request.headers[name] = value
