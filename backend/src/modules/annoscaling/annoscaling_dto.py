from pydantic import BaseModel, Field


class AnnoscalingSuggest(BaseModel):
    project_id: int = Field(description="Project to retrieve suggestions")
    code_id: int = Field(description="Code to provide suggestions for")
    reject_cide_id: int = Field(description="Code to use as opposing code")
    top_k: int = Field(description="Number of suggestions to provide")


class SdocSentencePair(BaseModel):
    sdoc_id: int = Field()
    sentence: int = Field()


class AnnoscalingConfirmSuggest(BaseModel):
    project_id: int = Field(description="Project to apply suggestions")
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
