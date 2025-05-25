from typing import List, Optional

from pydantic import BaseModel, Field


class PromptEmbedderInput(BaseModel):
    model_name: Optional[str] = Field(description="Model Name. If None, use default.")
    prompt: str = Field(description="Prompt for the model")
    data: List[str] = Field(description="Text Data to embed")


class PromptEmbedderOutput(BaseModel):
    embeddings: List[List[float]] = Field(description="Embeddings of the input data.")
