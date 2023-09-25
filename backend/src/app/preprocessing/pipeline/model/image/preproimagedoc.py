from typing import List

from app.preprocessing.pipeline.model.image.autobbox import AutoBBox
from app.preprocessing.pipeline.model.preprodoc_base import PreProDocBase
from pydantic import Field


class PreProImageDoc(PreProDocBase):
    bboxes: List[AutoBBox] = Field(default_factory=list)
