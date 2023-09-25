from pathlib import Path
from typing import List

from app.preprocessing.pipeline.model.audio.wordleveltranscription import (
    WordLevelTranscription,
)
from app.preprocessing.pipeline.model.preprodoc_base import PreProDocBase
from pydantic import Field


class PreProAudioDoc(PreProDocBase):
    word_level_transcriptions: List[WordLevelTranscription] = Field(
        default_factory=list
    )
    uncompressed_audio_filepath: Path = Field(default=None)
    transcript_filepath: Path = Field(default=Path)
    transcript_content: str = Field(default="")
