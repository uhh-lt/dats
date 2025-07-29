from preprocessing.pipeline.model.image.autobbox import AutoBBox
from preprocessing.pipeline.model.preprodoc_base import PreProDocBase
from pydantic import Field


class PreProImageDoc(PreProDocBase):
    bboxes: dict[str, set[AutoBBox]] = Field(default_factory=dict)
