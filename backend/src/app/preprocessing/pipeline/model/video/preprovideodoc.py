from pathlib import Path
from typing import List

from pydantic import Field

from app.core.data.dto.source_document_data import WordLevelTranscription
from app.preprocessing.pipeline.model.preprodoc_base import PreProDocBase


class PreProVideoDoc(PreProDocBase):
    audio_filepath: Path = Field(default_factory=Path)
    word_level_transcriptions: List[WordLevelTranscription] = Field(
        default_factory=list
    )
