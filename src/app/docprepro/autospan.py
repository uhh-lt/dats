from pydantic import BaseModel


class AutoSpan(BaseModel):
    type: str
    start: int
    end: int
