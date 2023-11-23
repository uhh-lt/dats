from pydantic import BaseModel, Field


class WordFrequencyBase(BaseModel):
    sdoc_id: int = Field(description="ID of the SourceDocument")
    word: str = Field(description="Word")
    count: int = Field(description="Count of the word in the SourceDocument")


class WordFrequencyRead(WordFrequencyBase):
    class Config:
        orm_mode = True


# Properties for creation
class WordFrequencyCreate(WordFrequencyBase):
    pass