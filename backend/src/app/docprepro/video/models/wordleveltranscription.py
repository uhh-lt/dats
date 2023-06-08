from pydantic import BaseModel, Field


class WordLevelTranscription(BaseModel):
    sdoc_id: int  # TODO: Nötig?
    text: str  # TODO: Text/Word/String?
    start_ms: int
    end_ms: int
