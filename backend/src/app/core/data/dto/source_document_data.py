from typing import List, Tuple

from pydantic import BaseModel, ConfigDict, Field


class SourceDocumentDataBase(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    content: str = Field(description="Raw,original content of the SourceDocument")
    html: str = Field(description="Processed HTML of the SourceDocument")
    token_starts: List[int] = Field(
        description="Start of each token in character offsets in content"
    )
    token_ends: List[int] = Field(
        description="End of each token in character offsets in content"
    )
    sentence_starts: List[int] = Field(
        description="Start of each sentence in character offsets in content"
    )
    sentence_ends: List[int] = Field(
        description="End of each sentence in character offsets in content"
    )


class SourceDocumentDataRead(SourceDocumentDataBase):
    tokens: List[str] = Field(description="List of tokens in the SourceDocument")
    token_character_offsets: List[Tuple[int, int]] = Field(
        description="List of character offsets of each token"
    )

    sentences: List[str] = Field(description="List of sentences in the SourceDocument")
    sentence_character_offsets: List[Tuple[int, int]] = Field(
        description="List of character offsets of each sentence"
    )

    model_config = ConfigDict(from_attributes=True)


# Properties for creation
class SourceDocumentDataCreate(SourceDocumentDataBase):
    pass
