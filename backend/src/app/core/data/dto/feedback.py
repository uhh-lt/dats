from datetime import datetime

from pydantic import BaseModel, Field


# Properties shared across all DTOs
class FeedbackBaseDTO(BaseModel):
    user_content: str = Field(description="User message of the Feedback")


# Properties to create
class FeedbackCreate(FeedbackBaseDTO):
    user_id: int = Field(description="User who created the Feedback")


# Properties to read
class FeedbackRead(FeedbackBaseDTO):
    id: str = Field(description="ID of the Feedback")
    user_id: int = Field(description="User who created the Feedback")
    created: datetime = Field(description="Created timestamp of the Feedback")
