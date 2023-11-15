from pathlib import Path

from pydantic import Field

from app.preprocessing.pipeline.model.preprodoc_base import PreProDocBase


class PreProVideoDoc(PreProDocBase):
    audio_filepath: Path = Field(default_factory=Path)
