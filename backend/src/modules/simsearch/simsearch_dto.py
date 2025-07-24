from pydantic import BaseModel, Field


class SimSearchHit(BaseModel):
    sdoc_id: int = Field(
        description="The ID of the SourceDocument similar to the query."
    )
    score: float = Field(description="The similarity score.")


class SimSearchSentenceHit(SimSearchHit):
    sentence_id: int = Field(
        description="The sentence id with respect to the SourceDocument"
    )


class SimSearchDocumentHit(SimSearchHit):
    compared_sdoc_id: int = Field(
        description="The ID of the SourceDocument that was compared."
    )


class SimSearchImageHit(SimSearchHit):
    pass
