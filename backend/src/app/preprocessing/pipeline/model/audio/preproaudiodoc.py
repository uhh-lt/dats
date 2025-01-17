from pathlib import Path
from typing import List, Optional

from pydantic import Field

from app.preprocessing.pipeline.model.audio.wordleveltranscription import (
    WordLevelTranscription,
)
from app.preprocessing.pipeline.model.preprodoc_base import PreProDocBase


class PreProAudioDoc(PreProDocBase):
    word_level_transcriptions: List[WordLevelTranscription] = Field(
        default_factory=list
    )
    uncompressed_audio_filepath: Optional[Path] = Field(default=None)
    transcript_filepath: Optional[Path] = Field(default=None)
    transcript_content: str = Field(default="")
