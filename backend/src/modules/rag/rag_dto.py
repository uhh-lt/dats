from pydantic import BaseModel, Field


class ChatSessionResponse(BaseModel):
    response: str = Field(description="The response of the model")
    session_id: str = Field(description="The session ID of the chat")
