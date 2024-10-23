from pydantic import BaseModel


class Sentence(BaseModel):
    text: str
    start: int
    end: int
