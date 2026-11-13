from datetime import datetime
from typing import Any, ClassVar

from pydantic import BaseModel, ConfigDict, Field

from modules.agent.agent_enum import AgentName
from repos.db.dto_base import UpdateDTOBase

# AG-UI thread ids are UUIDs; this bounds what a client may send
SESSION_ID_MAX_LENGTH = 128


# Properties shared across all DTOs
class AgentSessionBaseDTO(BaseModel):
    session_id: str = Field(
        description="Client-chosen ID of the AgentSession",
        max_length=SESSION_ID_MAX_LENGTH,
    )
    title: str = Field(description="Title of the AgentSession")


# Properties for creation
class AgentSessionCreate(AgentSessionBaseDTO):
    user_id: int = Field(description="User the AgentSession belongs to")
    project_id: int = Field(description="Project the AgentSession belongs to")
    agent_name: AgentName = Field(description="Agent the AgentSession talks to")
    messages: list[dict[str, Any]] = Field(
        description="pydantic-ai messages, serialized with ModelMessagesTypeAdapter"
    )


# Properties for updating
class AgentSessionUpdate(BaseModel, UpdateDTOBase):
    title: str | None = Field(
        description="Title of the AgentSession", default=None, min_length=1
    )

    non_nullable_fields: ClassVar[frozenset[str]] = frozenset({"title"})


class AgentSessionUpdateIntern(BaseModel, UpdateDTOBase):
    title: str | None = Field(description="Title of the AgentSession", default=None)
    messages: list[dict[str, Any]] | None = Field(
        description="pydantic-ai messages, serialized with ModelMessagesTypeAdapter",
        default=None,
    )

    non_nullable_fields: ClassVar[frozenset[str]] = frozenset({"title", "messages"})


# Properties for reading (as in ORM)
class AgentSessionRead(AgentSessionBaseDTO):
    id: int = Field(description="ID of the AgentSession")
    user_id: int = Field(description="User the AgentSession belongs to")
    project_id: int = Field(description="Project the AgentSession belongs to")
    agent_name: AgentName = Field(description="Agent the AgentSession talks to")
    created: datetime = Field(description="Created timestamp of the AgentSession")
    updated: datetime = Field(description="Updated timestamp of the AgentSession")
    model_config = ConfigDict(from_attributes=True)
