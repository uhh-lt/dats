from typing import List

import numpy as np
from pydantic import BaseModel, Field


class ClipImageEmbeddingInput(BaseModel):
    image_fps: List[str] = Field(example=["/path/to/image.png"])


class ClipTextEmbeddingInput(BaseModel):
    text: List[str] = Field(example=["Random text to encode"])


class ClipEmbeddingOutput(BaseModel):
    embeddings: List[List[float]] = Field(example=[[f for f in np.arange(0, 1, 0.1)]])

    def numpy(self) -> np.ndarray:
        return np.array(self.embeddings, dtype=np.float32)
