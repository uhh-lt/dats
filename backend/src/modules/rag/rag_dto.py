from pydantic import BaseModel, Field


class ChatSessionResponse(BaseModel):
    response: str = Field(description="The response of the model")
    session_id: str = Field(description="The session ID of the chat")


class RAGAnswerRequest(BaseModel):
    query: str = Field(description="The question to answer")
    sdoc_ids: list[int] | None = Field(
        description="The SourceDocuments to answer from; all if null"
    )
    top_k: int = Field(description="Number of retrieved sentences")
    threshold: float = Field(description="Minimum similarity of a retrieved sentence")
    model: str = Field(description="The LLM that answers")
    session_id: str | None = Field(
        default=None, description="The chat session to continue; a new one if null"
    )
