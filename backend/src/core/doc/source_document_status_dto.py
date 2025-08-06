from pydantic import BaseModel, ConfigDict, Field
from repos.db.dto_base import UpdateDTOBase


class SourceDocumenStatusBaseDTO(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    spacy: bool = Field(description="Spacy done?")
    es_index: bool = Field(description="ES Index done?")
    lang_detect: bool = Field(description="ES Index done?")


class SourceDocumentStatusRead(SourceDocumenStatusBaseDTO):
    model_config = ConfigDict(from_attributes=True)


class SourceDocumentStatusCreate(SourceDocumenStatusBaseDTO):
    pass


class SourceDocumentStatusUpdate(BaseModel, UpdateDTOBase):
    spacy: bool | None = Field(description="Spacy done?", default=None)
    es_index: bool | None = Field(description="ES Index done?", default=None)
    lang_detect: bool | None = Field(
        description="Language Detection done?", default=None
    )
