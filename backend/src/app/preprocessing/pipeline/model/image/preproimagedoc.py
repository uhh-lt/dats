from typing import List

from pydantic import Field

from app.preprocessing.pipeline.model.image.autobbox import AutoBBox
from app.preprocessing.pipeline.model.preprodoc_base import PreProDocBase


class PreProImageDoc(PreProDocBase):
    bboxes: List[AutoBBox] = Field(default_factory=list)
