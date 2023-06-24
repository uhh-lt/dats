from app.core.data.dto.code import CodeRead
from app.core.data.dto.source_document import SourceDocumentRead
from pydantic import BaseModel, Field


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
