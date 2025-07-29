from pydantic import BaseModel, Field


class PromptEmbedderInput(BaseModel):
    model_name: str = Field(
        description="Model Name. If 'default', uses default model, otherwise a model is trained or loaded."
    )
    prompt: str = Field(description="Prompt for the model")
    data: list[str] = Field(description="Text Data to embed")
    train_docs: list[str] | None = Field(
        default=None, description="Documents to train the model on"
    )
    train_labels: list[str] | None = Field(
        default=None, description="Labels for the documents"
    )


class PromptEmbedderOutput(BaseModel):
    embeddings: list[list[float]] = Field(description="Embeddings of the input data.")
