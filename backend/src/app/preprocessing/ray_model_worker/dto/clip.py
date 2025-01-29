from typing import List

import numpy as np
from pydantic import BaseModel, Field


class ClipImageEmbeddingInput(BaseModel):
    image_fps: List[str] = Field(examples=["image.png"])
    project_ids: List[int] = Field(examples=[1, 2, 3])


class ClipTextEmbeddingInput(BaseModel):
    text: List[str] = Field(examples=["Random text to encode"])


class ClipEmbeddingOutput(BaseModel):
    embeddings: List[List[float]] = Field(examples=[[f for f in np.arange(0, 1, 0.1)]])

    def numpy(self) -> np.ndarray:
        return np.array(self.embeddings, dtype=np.float32)
