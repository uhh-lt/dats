from pydantic import BaseModel


class WordLevelTranscription(BaseModel):
    sdoc_id: int
    text: str
    start_ms: int
    end_ms: int
