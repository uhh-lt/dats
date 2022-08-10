from pathlib import Path
from typing import List, Dict

from pydantic import BaseModel, Field

from app.docprepro.image.autobbox import AutoBBox


class PreProImageDoc(BaseModel):
    project_id: int
    sdoc_id: int
    image_dst: Path
    metadata: Dict[str, str] = Field(default=dict())

    bboxes: List[AutoBBox] = Field(default=list())
