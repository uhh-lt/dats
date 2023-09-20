from pathlib import Path
from typing import Dict, List

from app.docprepro.image.models.autobbox import AutoBBox
from pydantic import BaseModel, Field


class PreProImageDoc(BaseModel):
    project_id: int
    sdoc_id: int
    image_dst: Path
    mime_type: str
    metadata: Dict[str, str] = Field(default=dict())

    bboxes: List[AutoBBox] = Field(default=list())
