from pathlib import Path

from core.doc.source_document_data_dto import WordLevelTranscription
from preprocessing.pipeline.model.preprodoc_base import PreProDocBase
from pydantic import Field


class PreProAudioDoc(PreProDocBase):
    word_level_transcriptions: list[WordLevelTranscription] = Field(
        default_factory=list
    )
    uncompressed_audio_filepath: Path | None = Field(default=None)
    transcript_filepath: Path | None = Field(default=None)
    transcript_content: str = Field(default="")
    tokens: list[str] | None = Field(default=None)
    token_character_offsets: list[tuple[int, int]] | None = Field(default=None)
