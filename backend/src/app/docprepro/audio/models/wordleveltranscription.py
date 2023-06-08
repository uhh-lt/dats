from pydantic import BaseModel


class WordLevelTranscription(BaseModel):
    text: str
    start_ms: int
    end_ms: int
