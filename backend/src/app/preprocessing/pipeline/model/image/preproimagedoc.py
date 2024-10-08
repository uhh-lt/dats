from typing import Set

from pydantic import Field

from app.preprocessing.pipeline.model.image.autobbox import AutoBBox
from app.preprocessing.pipeline.model.preprodoc_base import PreProDocBase


class PreProImageDoc(PreProDocBase):
    bboxes: Set[AutoBBox] = Field(default_factory=list)
