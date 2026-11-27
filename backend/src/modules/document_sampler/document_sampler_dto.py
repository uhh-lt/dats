from pydantic import BaseModel, Field


class SampledSdocsResults(BaseModel):
    tags: list[int] = Field(description="The tags aggregated by.")
    sdocs: list[int] = Field(description="The grouped SourceDocument IDs.")
    sample_fixed: list[int] = Field(
        description="The fixed sample of SourceDocument IDs."
    )
    sample_relative: list[int] = Field(
        description="The relative sample of SourceDocument IDs."
    )


class DocumentSampleRequest(BaseModel):
    tag_groups: list[list[int]] = Field(
        description="Groups of Tags; the documents are sampled per group"
    )
    n: int = Field(description="Number of documents to sample per group")
    frac: float = Field(description="Fraction of the documents to sample per group")
