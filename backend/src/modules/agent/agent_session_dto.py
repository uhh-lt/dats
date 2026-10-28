from typing import Any

from pydantic import BaseModel


class AgentSessionBase(BaseModel):
    session_id: str
    title: str | None = None
    user_id: int
    messages: list[dict[str, Any]]


class AgentSessionCreate(AgentSessionBase):
    pass


class AgentSessionUpdate(BaseModel):
    title: str | None = None
    messages: list[dict[str, Any]] | None = None
