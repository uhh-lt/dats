from typing import List

from pydantic import BaseModel, Field

from app.core.data.dto.code import CodeRead
from app.core.data.dto.source_document import SourceDocumentRead


class AnalysisQueryParameters(BaseModel):
    user_ids: List[int] = Field(
        description="The user ids dictate which codes are analysed."
    )
    proj_id: int = Field(description="The ID of the Project to analyse.")


class CodeOccurrence(BaseModel):
    sdoc: SourceDocumentRead = Field(
        description="The SourceDocument where the Code occurs."
    )
    code: CodeRead = Field(description="The occuring Code.")
    text: str = Field(
        description="A text span of the SourceDocument annotated with the Code."
    )
    count: int = Field(
        description="The number of occurrences of the text span annotated with the Code in the SourceDocument."
    )


class CodeFrequencies(BaseModel):
    code: CodeRead = Field(description="The Code.")
    count: int = Field(description="The number of occurrences of that Code.")
    aggregated_count: int = Field(
        description="The number of occurrences of that Code and all its children Codes."
    )
    occurrences: List[CodeOccurrence] = Field(
        description="All occurrences of that code."
    )
    children: List["CodeFrequencies"] = Field(
        description="CodeStatistics of the Code's children"
    )
