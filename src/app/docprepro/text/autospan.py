from pydantic import BaseModel


class AutoSpan(BaseModel):
    code: str
    start: int
    end: int
