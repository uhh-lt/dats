from typing import Any

from pydantic import BaseModel, Field


class AgentQueryRequest(BaseModel):
    session_id: str | None = Field(
        description="AgentSession to continue (a new one is started if omitted)",
        default=None,
    )
    prompt: str = Field(description="The user's prompt")


class AgentQueryResponse(BaseModel):
    session_id: str = Field(description="AgentSession the prompt was answered in")
    response: str = Field(description="The agent's answer")
    tools_used: list[str] = Field(description="Names of the tools the agent called")
    approvals_required: list[str] = Field(
        description="Names of the tools the agent wants to call, but which need the "
        "user's approval first (only possible via the AG-UI endpoint)"
    )


class AgentSessionHistory(BaseModel):
    messages: list[dict[str, Any]] = Field(
        description="The messages of the AgentSession as AG-UI messages"
    )


class AgentSessionTitle(BaseModel):
    title: str = Field(
        description="A concise, 3 to 6 word descriptive title for the chat session.",
        max_length=60,
    )
