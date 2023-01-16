from pathlib import Path
from typing import List, Dict

from pydantic import BaseModel, Field

from app.docprepro.audio.models.autotimespan import AutoTimespan


class PreProAudioDoc(BaseModel):
    project_id: int
    sdoc_id: int
    audio_dst: Path
    mime_type: str
    metadata: Dict[str, str] = Field(default=dict())

    timespan: List[AutoTimespan] = Field(default=list())
