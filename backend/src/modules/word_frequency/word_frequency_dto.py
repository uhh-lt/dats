from pydantic import BaseModel, Field

from modules.word_frequency.word_frequency_columns import WordFrequencyColumns
from systems.search_system.filtering import Filter
from systems.search_system.sorting import Sort


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


class WordFrequencySearchRequest(BaseModel):
    filter: Filter[WordFrequencyColumns] = Field(description="Column filter tree")
    sorts: list[Sort[WordFrequencyColumns]] = Field(
        default=[], description="Ordered sort expressions"
    )
    page_number: int = Field(default=0, ge=0, description="Zero-based page index")
    page_size: int = Field(default=20, ge=1, description="Number of rows per page")


class WordFrequencyExportRequest(BaseModel):
    filter: Filter[WordFrequencyColumns] = Field(description="Column filter tree")
