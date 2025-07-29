from pydantic import BaseModel, Field


class SeqSentTaggerDoc(BaseModel):
    sent_labels: list[str] = Field(description="Labels for each sentence")
    sent_embeddings: list[list[float]] = Field(
        description="Precomputed Sentence Embeddings"
    )


class SeqSentTaggerJobInput(BaseModel):
    project_id: int = Field(description="Project ID")
    training_data: list[SeqSentTaggerDoc] = Field(
        description="Training Data for the Sequential Sentence Tagger"
    )
    test_data: list[SeqSentTaggerDoc] = Field(
        description="Test Data for the Sequential Sentence Tagger"
    )


class SeqSentTaggerJobResponse(BaseModel):
    pred_data: list[SeqSentTaggerDoc] = Field(
        description="Predictions of the Sequential Sentence Tagger"
    )
