from typing import List, Optional

from pydantic import BaseModel, Field


class PromptEmbedderInput(BaseModel):
    model_name: str = Field(
        description="Model Name. If 'default', uses default model, otherwise a model is trained or loaded."
    )
    prompt: str = Field(description="Prompt for the model")
    data: List[str] = Field(description="Text Data to embed")
    train_docs: Optional[List[str]] = Field(
        description="Documents to train the model on"
    )
    train_labels: Optional[List[str]] = Field(description="Labels for the documents")


class PromptEmbedderOutput(BaseModel):
    embeddings: List[List[float]] = Field(description="Embeddings of the input data.")
