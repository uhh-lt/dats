from pydantic import BaseModel


class AutoSpan(BaseModel, frozen=True):
    code: str
    text: str
    start: int
    end: int
    start_token: int
    end_token: int
