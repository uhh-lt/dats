from pydantic import BaseModel


class AutoSentAnno(BaseModel, frozen=True):
    code: str
    start: int
    end: int
    user_id: int
