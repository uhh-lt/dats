from pathlib import Path

from app.preprocessing.pipeline.model.preprodoc_base import PreProDocBase
from pydantic import Field


class PreProVideoDoc(PreProDocBase):
    audio_filepath: Path = Field(default_factory=Path)
