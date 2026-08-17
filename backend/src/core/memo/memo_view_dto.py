from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from modules.search.memo_search.memo_search_columns import MemoColumns
from systems.search_system.filtering import Filter
from systems.search_system.grouping import DateGranularity, GroupConfig
from systems.search_system.sorting import Sort


class MemoViewLayout(str, Enum):
    TABLE = "table"
    LIST = "list"
    BOARD = "board"
    GALLERY = "gallery"
    FEED = "feed"


class MemoViewBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    layout: MemoViewLayout
    filters: Filter[MemoColumns]
    group_by: GroupConfig[MemoColumns] | None = None
    sort_by: Sort[MemoColumns] | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        name = value.strip()
        if name == "":
            raise ValueError("Memo view name cannot be blank")
        return name

    @model_validator(mode="after")
    def validate_group_by(self) -> "MemoViewBase":
        if self.group_by is None:
            return self
        field = self.group_by.field
        if not field.is_groupable():
            raise ValueError(f"Column {field} does not support grouping")
        is_date_group = field in {MemoColumns.CREATED, MemoColumns.UPDATED}
        if is_date_group and self.group_by.date_granularity is None:
            self.group_by.date_granularity = DateGranularity.MONTH
        if not is_date_group:
            self.group_by.date_granularity = None
        return self

    @model_validator(mode="after")
    def validate_board_group(self) -> "MemoViewBase":
        if self.layout == MemoViewLayout.BOARD and self.group_by is None:
            raise ValueError("Board views require a group")
        return self


class MemoViewCreate(MemoViewBase):
    project_id: int


class MemoViewUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    layout: MemoViewLayout | None = None
    filters: Filter[MemoColumns] | None = None
    group_by: GroupConfig[MemoColumns] | None = None
    sort_by: Sort[MemoColumns] | None = None
    clear_group_by: bool = False
    clear_sort_by: bool = False

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        name = value.strip()
        if name == "":
            raise ValueError("Memo view name cannot be blank")
        return name


class MemoViewReorder(BaseModel):
    view_ids: list[int]

    @field_validator("view_ids")
    @classmethod
    def validate_unique_view_ids(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("Memo view order cannot contain duplicate view IDs")
        return value


class MemoViewRead(MemoViewBase):
    id: int
    project_id: int
    user_id: int
    position: int
    created: datetime
    updated: datetime
    model_config = ConfigDict(from_attributes=True)
