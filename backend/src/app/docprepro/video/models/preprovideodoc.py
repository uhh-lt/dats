from pathlib import Path
from typing import List, Dict

from pydantic import BaseModel, Field

from app.docprepro.video.models.autotimespan import AutoTimespan


class PreProVideoDoc(BaseModel):
    project_id: int
    sdoc_id: int
    video_dst: Path
    mime_type: str
    metadata: Dict[str, str] = Field(default=dict())

    timespan: List[AutoTimespan] = Field(default=list())
