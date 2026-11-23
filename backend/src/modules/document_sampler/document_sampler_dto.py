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
