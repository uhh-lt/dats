from pydantic import BaseModel, Field

from common.doc_type_enum import DocType
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


class CodeFrequencyRequest(BaseModel):
    code_ids: list[int] = Field(description="The Codes to count")
    user_ids: list[int] = Field(description="The Users whose annotations are counted")
    doctypes: list[DocType] = Field(description="The document types to count in")


class CodeOccurrenceRequest(BaseModel):
    code_id: int = Field(description="The Code whose occurrences are listed")
    return_children: bool = Field(description="Whether to include the child Codes")
    user_ids: list[int] = Field(description="The Users whose annotations are listed")
    doctypes: list[DocType] = Field(description="The document types to list from")
