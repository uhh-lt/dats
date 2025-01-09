from typing import List, Optional, Tuple

from pydantic import BaseModel, ConfigDict, Field


class WordLevelTranscription(BaseModel):
    text: str
    start_ms: int
    end_ms: int


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
    token_time_starts: Optional[List[int]] = Field(
        description="Start times of each token in transcript", default=None
    )
    token_time_ends: Optional[List[int]] = Field(
        description="End times of each token in transcript", default=None
    )


class SourceDocumentDataRead(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    project_id: int = Field(
        description="ID of the Project the SourceDocument belongs to"
    )
    html: str = Field(description="Processed HTML of the SourceDocument")
    tokens: List[str] = Field(description="List of tokens in the SourceDocument")
    token_character_offsets: List[Tuple[int, int]] = Field(
        description="List of character offsets of each token"
    )
    sentences: List[str] = Field(description="List of sentences in the SourceDocument")
    word_level_transcriptions: Optional[List[WordLevelTranscription]] = Field(
        description="word level transcriptions, with tokens, start times and end times",
        default=None,
    )

    model_config = ConfigDict(from_attributes=True)


# Properties for creation
class SourceDocumentDataCreate(SourceDocumentDataBase):
    pass
