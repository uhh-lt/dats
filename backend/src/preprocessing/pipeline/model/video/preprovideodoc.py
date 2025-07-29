from pathlib import Path

from core.doc.source_document_data_dto import WordLevelTranscription
from preprocessing.pipeline.model.preprodoc_base import PreProDocBase
from pydantic import Field


class PreProVideoDoc(PreProDocBase):
    audio_filepath: Path = Field(default_factory=Path)
    word_level_transcriptions: list[WordLevelTranscription] = Field(
        default_factory=list
    )
