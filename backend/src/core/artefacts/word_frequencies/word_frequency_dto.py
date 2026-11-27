from pydantic import BaseModel, Field


class WordFrequencyBaseDTO(BaseModel):
    sdoc_id: int = Field(description="ID of the SourceDocument")
    word: str = Field(description="Word")
    count: int = Field(description="Count of the word in the SourceDocument")


# Properties for creation
class WordFrequencyCreate(WordFrequencyBaseDTO):
    project_id: int = Field(description="Project the SourceDocument belongs to")
