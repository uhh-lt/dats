from pathlib import Path
from typing import List, Dict

from pydantic import BaseModel, Field

from app.docprepro.image.autobbox import AutoBBox


class PreProImageDoc(BaseModel):
    project_id: int
    sdoc_id: int
    image_dst: Path
    metadata: Dict[str, str] = Field(default=dict())

    bboxes: Dict[str, List[AutoBBox]] = Field(default=dict())

    # @validator("image", pre=True, always=True)
    # def skip_image_type_validation(cls, image: Image):
    #     return image
    #
    # class Config:
    #     arbitrary_types_allowed = True
