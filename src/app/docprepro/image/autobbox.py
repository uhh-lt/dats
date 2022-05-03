from pydantic import BaseModel


class AutoBBox(BaseModel):
    type: str
    x: int
    y: int
    w: int
    h: int
