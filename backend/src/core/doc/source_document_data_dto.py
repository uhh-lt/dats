from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase


class WordLevelTranscription(BaseModel):
    text: str
    start_ms: int
    end_ms: int


class SourceDocumentDataBase(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    content: str = Field(description="Raw,original content of the SourceDocument")
    repo_url: str = Field(
        description="Relative ppath to the the SourceDocument in the repository"
    )
    html: str = Field(description="Processed HTML of the SourceDocument")
    token_starts: list[int] = Field(
        description="Start of each token in character offsets in content"
    )
    token_ends: list[int] = Field(
        description="End of each token in character offsets in content"
    )
    sentence_starts: list[int] = Field(
        description="Start of each sentence in character offsets in content"
    )
    sentence_ends: list[int] = Field(
        description="End of each sentence in character offsets in content"
    )
    token_time_starts: list[int] | None = Field(
        description="Start times of each token in transcript", default=None
    )
    token_time_ends: list[int] | None = Field(
        description="End times of each token in transcript", default=None
    )


class SourceDocumentDataRead(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    project_id: int = Field(
        description="ID of the Project the SourceDocument belongs to"
    )
    repo_url: str = Field(
        description="Relative path to the SourceDocument in the repository"
    )
    html: str = Field(description="Processed HTML of the SourceDocument")
    tokens: list[str] = Field(description="List of tokens in the SourceDocument")
    token_character_offsets: list[tuple[int, int]] = Field(
        description="List of character offsets of each token"
    )
    sentences: list[str] = Field(description="List of sentences in the SourceDocument")
    word_level_transcriptions: list[WordLevelTranscription] | None = Field(
        description="word level transcriptions, with tokens, start times and end times",
    )

    model_config = ConfigDict(from_attributes=True)


class SourceDocumentDataUpdate(BaseModel, UpdateDTOBase):
    token_starts: list[int] | None = Field(
        description="Start of each token in character offsets in content", default=None
    )
    token_ends: list[int] | None = Field(
        description="End of each token in character offsets in content", default=None
    )
    sentence_starts: list[int] | None = Field(
        description="Start of each sentence in character offsets in content",
        default=None,
    )
    sentence_ends: list[int] | None = Field(
        description="End of each sentence in character offsets in content", default=None
    )
    token_time_starts: list[int] | None = Field(
        description="Start times of each token in transcript", default=None
    )
    token_time_ends: list[int] | None = Field(
        description="End times of each token in transcript", default=None
    )
    html: str | None = Field(description="HTML of the SourceDocument", default=None)
    content: str | None = Field(
        description="Content of the SourceDocument", default=None
    )


# Properties for creation
class SourceDocumentDataCreate(SourceDocumentDataBase):
    pass
