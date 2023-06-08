from pathlib import Path
from typing import List, Dict, Optional

from pydantic import BaseModel, Field

# from app.docprepro.audio.models.autotimespan import AutoTimespan
from app.docprepro.audio.models.wordleveltranscription import WordLevelTranscription


class PreProAudioDoc(BaseModel):
    project_id: int
    sdoc_id: int
    audio_dst: Path
    mime_type: str
    metadata: Dict[str, str] = Field(default=dict())
    # timespans: List[AutoTimespan] = Field(default=list())

    word_level_transcriptions: List[WordLevelTranscription] = Field(default=list())

    uncompressed_fn: Optional[Path]
    uncompressed_sdoc_id: Optional[int]

    transcript_sdoc_fn: Optional[Path]
    transcript_sdoc_id: Optional[int]
