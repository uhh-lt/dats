from pathlib import Path
from typing import List, Optional, Tuple

from core.doc.source_document_data_dto import WordLevelTranscription
from preprocessing.pipeline.model.preprodoc_base import PreProDocBase
from pydantic import Field


class PreProAudioDoc(PreProDocBase):
    word_level_transcriptions: List[WordLevelTranscription] = Field(
        default_factory=list
    )
    uncompressed_audio_filepath: Optional[Path] = Field(default=None)
    transcript_filepath: Optional[Path] = Field(default=None)
    transcript_content: str = Field(default="")
    tokens: Optional[List[str]] = Field(default=None)
    token_character_offsets: Optional[List[Tuple[int, int]]] = Field(default=None)
