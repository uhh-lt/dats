from datetime import datetime
from enum import Enum
from typing import List

from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm.attributes import InstrumentedAttribute

from core.code.code_dto import CodeRead
from core.doc.source_document_dto import SourceDocumentRead


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


class CodeFrequency(BaseModel):
    code_id: int = Field(description="The id of the code.")
    count: int = Field(description="The number of occurrences of the code.")
    child_count: int = Field(
        description="The number of occurrences of all child codes of the code."
    )
    total_count: int = Field(
        description="The total number of occurrences of the code and all its child codes."
    )


class SampledSdocsResults(BaseModel):
    tags: list[int] = Field(description="The tags aggregated by.")
    sdocs: list[int] = Field(description="The grouped SourceDocument IDs.")
    sample_fixed: list[int] = Field(
        description="The fixed sample of SourceDocument IDs."
    )
    sample_relative: list[int] = Field(
        description="The relative sample of SourceDocument IDs."
    )


class DateGroupBy(Enum):
    YEAR = "YEAR"
    MONTH = "MONTH"
    DAY = "DAY"

    def apply(self, column: InstrumentedAttribute[datetime]) -> List:
        match self:
            case DateGroupBy.YEAR:
                return [func.extract("year", column)]
            case DateGroupBy.MONTH:
                return [func.extract("year", column), func.extract("month", column)]
            case DateGroupBy.DAY:
                return [
                    func.extract("year", column),
                    func.extract("month", column),
                    func.extract("day", column),
                ]
