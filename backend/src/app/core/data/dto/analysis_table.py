from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.data.table_type import TableType


# Properties shared across all DTOs
class AnalysisTableBaseDTO(BaseModel):
    title: str = Field(description="Title of the AnalysisTable")
    content: str = Field(description="Content of the AnalysisTable")
    table_type: TableType = Field(description="TABLETYPE of the AnalysisTable")


# Properties for creation
class AnalysisTableCreate(AnalysisTableBaseDTO):
    project_id: int = Field(description="Project the AnalysisTable belongs to")
    user_id: Optional[int] = Field(
        description="User the AnalysisTable belongs to. Do not send any value for this field, it is automatically set by the backend.",
        default=None,
    )

    @field_validator("user_id")
    @classmethod
    def user_id_must_be_none(cls, val: Optional[int]) -> Optional[int]:
        return None


# Properties for updating
class AnalysisTableUpdate(AnalysisTableBaseDTO, UpdateDTOBase):
    pass


# Properties for reading (as in ORM)
class AnalysisTableRead(AnalysisTableBaseDTO):
    id: int = Field(description="ID of the AnalysisTable")
    project_id: int = Field(description="Project the AnalysisTable belongs to")
    user_id: int = Field(description="User the AnalysisTable belongs to")
    created: datetime = Field(description="Created timestamp of the AnalysisTable")
    updated: datetime = Field(description="Updated timestamp of the AnalysisTable")
    model_config = ConfigDict(from_attributes=True)
