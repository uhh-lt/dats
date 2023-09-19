from pathlib import Path
from typing import Dict, List, Optional

from app.docprepro.video.models.autotimespan import AutoTimespan
from app.docprepro.video.models.wordleveltranscription import WordLevelTranscription
from pydantic import BaseModel, Field


class PreProVideoDoc(BaseModel):
    project_id: int
    sdoc_id: int
    video_dst: Path
    mime_type: str
    metadata: Dict[str, str] = Field(default=dict())
    # language: Optional[str]
    # timespans: List[AutoTimespan] = Field(default=list())

    # word_level_transcriptions: List[WordLevelTranscription] = Field(default=list())

    # TODO: sdoc_link_audio_uncompressed
