from collections.abc import AsyncIterator

from ag_ui.core import Message
from pydantic import BaseModel, ConfigDict, Field

from modules.agent.agent_session_dto import SESSION_ID_MAX_LENGTH, AgentSessionRead


class AgentQueryRequest(BaseModel):
    session_id: str | None = Field(
        description="AgentSession to continue (a new one is started if omitted)",
        default=None,
        max_length=SESSION_ID_MAX_LENGTH,
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
    session: AgentSessionRead = Field(description="The AgentSession after the run")


class AgentRunStream(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    events: AsyncIterator[str] = Field(
        description="The encoded AG-UI events of the run; the run happens while they are read"
    )
    content_type: str = Field(description="Content type of the encoded events")
    session: AgentSessionRead = Field(
        description="The AgentSession as stored when the run started (with the prompt)"
    )
    needs_title: bool = Field(
        description="Whether the AgentSession is new and still has the prompt as title"
    )
    model_name: str = Field(description="The LLM the run uses")


class AgentSessionHistory(BaseModel):
    messages: list[Message] = Field(
        description="The messages of the AgentSession as AG-UI messages"
    )


class AgentToolRead(BaseModel):
    name: str = Field(description="Name of the tool (the operation id of its endpoint)")
    description: str | None = Field(
        description="What the tool does (the summary of its endpoint)"
    )
    needs_approval: bool = Field(
        description="Whether the agent asks the user before it calls the tool"
    )


class AgentSessionTitle(BaseModel):
    title: str = Field(
        description="A concise, 3 to 6 word descriptive title for the chat session.",
        max_length=60,
    )
