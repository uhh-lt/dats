from pydantic import BaseModel, Field


class LLMSessionResponse(BaseModel):
    response: str = Field(description="The response of the LLM")
    session_id: str = Field(description="The session ID of the LLM chat")
