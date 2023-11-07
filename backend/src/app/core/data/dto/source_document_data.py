from typing import List, Optional

from pydantic import BaseModel, Field


# Properties for creation
class SourceDocumentDataCreate(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    content: Optional[str] = Field(
        description="Raw,original content of the SourceDocument", default=None
    )
    html: Optional[str] = Field(
        description="Processed HTML of the SourceDocument", default=None
    )
    token_starts: Optional[List[int]] = Field(
        description="Start of each token in character offsets in content", default=None
    )
    token_ends: Optional[List[int]] = Field(
        description="End of each token in character offsets in content", default=None
    )
    sentence_starts: Optional[List[int]] = Field(
        description="Start of each sentence in character offsets in content",
        default=None,
    )
    sentence_ends: Optional[List[int]] = Field(
        description="End of each sentence in character offsets in content", default=None
    )
