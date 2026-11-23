from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase


class WordLevelTranscription(BaseModel):
    text: str = Field(description="The transcribed word")
    start_ms: int = Field(description="Start of the word in the audio in milliseconds")
    end_ms: int = Field(description="End of the word in the audio in milliseconds")


class SourceDocumentDataBase(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    content: str = Field(description="text content of the SourceDocument")
    raw_html: str = Field(
        description="The raw HTML content of the SourceDocument, extracted from the file and cleaned."
    )
    html: str = Field(
        description="Our DATS custom HTML of the SourceDocument (with sent and t tags)"
    )
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
    transcript_word_starts: list[int] | None = Field(
        description="Start of each word of the transcript in character offsets in content",
        default=None,
    )
    transcript_word_ends: list[int] | None = Field(
        description="End of each word of the transcript in character offsets in content",
        default=None,
    )
    transcript_word_time_starts: list[int] | None = Field(
        description="Start of each word of the transcript in the audio in milliseconds",
        default=None,
    )
    transcript_word_time_ends: list[int] | None = Field(
        description="End of each word of the transcript in the audio in milliseconds",
        default=None,
    )


class SourceDocumentDataRead(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    project_id: int = Field(
        description="ID of the Project the SourceDocument belongs to"
    )
    html: str = Field(description="Processed HTML of the SourceDocument")
    tokens: list[str] = Field(description="List of tokens in the SourceDocument")
    token_character_offsets: list[tuple[int, int]] = Field(
        description="List of character offsets of each token"
    )
    sentences: list[str] = Field(description="List of sentences in the SourceDocument")
    word_level_transcriptions: list[WordLevelTranscription] | None = Field(
        description="The words of the transcript of an audio or video document, with their start and end times; None for other documents",
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
    transcript_word_starts: list[int] | None = Field(
        description="Start of each word of the transcript in character offsets in content",
        default=None,
    )
    transcript_word_ends: list[int] | None = Field(
        description="End of each word of the transcript in character offsets in content",
        default=None,
    )
    transcript_word_time_starts: list[int] | None = Field(
        description="Start of each word of the transcript in the audio in milliseconds",
        default=None,
    )
    transcript_word_time_ends: list[int] | None = Field(
        description="End of each word of the transcript in the audio in milliseconds",
        default=None,
    )
    raw_html: str | None = Field(
        description="The raw HTML content of the SourceDocument, extracted from the file and cleaned.",
        default=None,
    )
    html: str | None = Field(
        description="Our DATS custom HTML of the SourceDocument (with sent and t tags)",
        default=None,
    )
    content: str | None = Field(
        description="Content of the SourceDocument", default=None
    )


# Properties for creation
class SourceDocumentDataCreate(SourceDocumentDataBase):
    pass
