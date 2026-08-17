from datetime import datetime

from pydantic import BaseModel, Field

from core.memo.memo_dto import AttachedObjectType
from core.memo.memo_view_dto import MemoGroupConfig, MemoSortConfig
from modules.search.memo_search.memo_search_columns import MemoColumns
from systems.search_system.filtering import Filter


class MemoObjectReference(BaseModel):
    id: int
    type: AttachedObjectType
    label: str


class MemoContextReference(BaseModel):
    id: int
    label: str


class MemoSummary(BaseModel):
    id: int
    title: str
    icon: str | None
    content_excerpt: str
    user_id: int
    project_id: int
    created: datetime
    updated: datetime
    is_favorite: bool
    attached_object: MemoObjectReference
    source_document: MemoContextReference | None = None
    code: MemoContextReference | None = None


class MemoQueryRequest(BaseModel):
    project_id: int
    search_query: str = ""
    filters: Filter[MemoColumns]
    sort_by: MemoSortConfig | None = None
    group_by: MemoGroupConfig | None = None
    group_key: str | None = None
    page_number: int = Field(default=0, ge=0)
    page_size: int = Field(default=20, ge=1, le=200)


class MemoPage(BaseModel):
    items: list[MemoSummary]
    total_results: int


class MemoGroupTarget(BaseModel):
    id: int
    type: AttachedObjectType


class MemoGroupSummary(BaseModel):
    key: str
    label: str
    total_results: int
    target: MemoGroupTarget | None = None


class MemoGroupQueryRequest(BaseModel):
    project_id: int
    search_query: str = ""
    filters: Filter[MemoColumns]
    group_by: MemoGroupConfig
    page_number: int = Field(default=0, ge=0)
    page_size: int = Field(default=20, ge=1, le=100)


class MemoGroupPage(BaseModel):
    items: list[MemoGroupSummary]
    total_results: int
