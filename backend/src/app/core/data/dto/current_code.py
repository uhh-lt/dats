from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .dto_base import UpdateDTOBase


# Properties shared across all DTOs
class CurrentCodeBaseDTO(BaseModel):
    code_id: Optional[int] = Field(description="Code of the CurrentCode", default=None)


# Properties for creation
class CurrentCodeCreate(CurrentCodeBaseDTO):
    code_id: int = Field(description="Code of the CurrentCode", default=None)


# Properties for updating
class CurrentCodeUpdate(CurrentCodeBaseDTO, UpdateDTOBase):
    pass


# Properties for reading (as in ORM)
class CurrentCodeRead(CurrentCodeBaseDTO):
    id: int = Field(description="ID of the CurrentCode")
    model_config = ConfigDict(from_attributes=True)
