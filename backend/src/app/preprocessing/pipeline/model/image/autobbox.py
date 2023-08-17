from pydantic import BaseModel


class AutoBBox(BaseModel):
    code: str
    x_min: int
    y_min: int
    x_max: int
    y_max: int
