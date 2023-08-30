from datetime import datetime

from app.core.data.dto.dto_base import UpdateDTOBase
from pydantic import BaseModel, Field

from app.core.data.table_type import TableType


# Properties shared across all DTOs
class AnalysisTableBaseDTO(BaseModel):
    title: str = Field(description="Title of the AnalysisTable")
    content: str = Field(description="Content of the AnalysisTable")
    table_type: TableType = Field(description="TABLETYPE of the AnalysisTable")


# Properties for creation
class AnalysisTableCreate(AnalysisTableBaseDTO):
    project_id: int = Field(description="Project the AnalysisTable belongs to")
    user_id: int = Field(description="User the AnalysisTable belongs to")


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

    class Config:
        orm_mode = True
