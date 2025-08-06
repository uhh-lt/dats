from pydantic import BaseModel, ConfigDict, Field
from repos.db.dto_base import UpdateDTOBase


class SourceDocumenStatusBaseDTO(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    spacy: bool = Field(description="Spacy done?")


class SourceDocumentStatusRead(SourceDocumenStatusBaseDTO):
    model_config = ConfigDict(from_attributes=True)


class SourceDocumentStatusCreate(SourceDocumenStatusBaseDTO):
    pass


class SourceDocumentStatusUpdate(BaseModel, UpdateDTOBase):
    spacy: bool | None = Field(default=None, description="Spacy done?")
