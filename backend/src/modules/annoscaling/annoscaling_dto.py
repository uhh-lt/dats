from pydantic import BaseModel, Field


class AnnoscalingSuggest(BaseModel):
    code_id: int = Field(description="Code to provide suggestions for")
    reject_code_id: int = Field(description="Code to use as opposing code")
    top_k: int = Field(description="Number of suggestions to provide")


class SdocSentencePair(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    sentence: int = Field(description="ID of the sentence within the document")


class AnnoscalingConfirmSuggest(BaseModel):
    code_id: int = Field(description="Code to apply on accepted spans")
    reject_code_id: int = Field(description="Code to apply on rejected spans")
    accept: list[SdocSentencePair] = Field(
        description="Suggested annotations to accept"
    )
    reject: list[SdocSentencePair] = Field(
        description="Suggested annotations to reject"
    )


class AnnoscalingResult(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    sentence_id: int = Field(description="ID of the sentence within the document")
    text: str = Field(description="Sentence text")


class AnnoscalingSentenceHit(BaseModel):
    sdoc_id: int = Field(description="ID of the source document of the sentence")
    sentence_id: int = Field(description="ID of the sentence within the document")
    score: float = Field(description="Similarity of the sentence to an annotated one")
