from typing import Dict, Set

from preprocessing.pipeline.model.image.autobbox import AutoBBox
from preprocessing.pipeline.model.preprodoc_base import PreProDocBase
from pydantic import Field


class PreProImageDoc(PreProDocBase):
    bboxes: Dict[str, Set[AutoBBox]] = Field(default_factory=dict)
