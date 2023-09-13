from typing import Any, Dict

from pydantic import BaseModel, Field


class WhisperInput(BaseModel):
    uncompressed_audio_fp: str = Field(example="/path/to/uncompressed/audio.wav")


class WhisperOutput(BaseModel):
    out: Dict[str, Any] = Field(example={"transcript": "Hello World!"})
