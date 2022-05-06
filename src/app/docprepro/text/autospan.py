from pydantic import BaseModel


class AutoSpan(BaseModel):
    code: str
    text: str
    start: int
    end: int
