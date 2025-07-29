from pydantic import BaseModel, ConfigDict, Field


class WordFrequencyBase(BaseModel):
    sdoc_id: int = Field(description="ID of the SourceDocument")
    word: str = Field(description="Word")
    count: int = Field(description="Count of the word in the SourceDocument")


class WordFrequencyRead(WordFrequencyBase):
    model_config = ConfigDict(from_attributes=True)


# Properties for creation
class WordFrequencyCreate(WordFrequencyBase):
    pass


class WordFrequencyStat(BaseModel):
    word: str = Field(description="The word.")
    word_percent: float = Field(description="The percentage of the word.")
    count: int = Field(description="The SourceDoument IDs.")
    sdocs: int = Field(description="The number of SourceDocuments.")
    sdocs_percent: float = Field(description="The percentage of SourceDocuments.")


class WordFrequencyResult(BaseModel):
    total_results: int = Field(
        description="The total number of word_frequencies. Used for pagination."
    )
    sdocs_total: int = Field(description="The total number of SourceDocuments.")
    words_total: int = Field(description="The total number of words.")
    word_frequencies: list[WordFrequencyStat] = Field(
        description="The WordFrequencies."
    )
