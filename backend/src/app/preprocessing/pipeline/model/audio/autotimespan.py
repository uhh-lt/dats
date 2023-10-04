from pydantic import BaseModel


class AutoTimespan(BaseModel):
    transcription: str
    code: str
    begin: int
    end: int
