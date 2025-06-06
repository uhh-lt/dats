from typing import List

import numpy as np
from pydantic import BaseModel, Field


class ClipImageEmbeddingInput(BaseModel):
    base64_images: List[str] = Field(
        examples=["base64_image_string"], description="The base64 encoded images."
    )


class ClipTextEmbeddingInput(BaseModel):
    text: List[str] = Field(examples=["Random text to encode"])


class ClipEmbeddingOutput(BaseModel):
    embeddings: List[List[float]] = Field(examples=[[f for f in np.arange(0, 1, 0.1)]])

    def numpy(self) -> np.ndarray:
        return np.array(self.embeddings, dtype=np.float32)
