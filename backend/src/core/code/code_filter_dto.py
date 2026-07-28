from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from core.code.code_dto import CodeRead


class CodeFilterReleaseTag(BaseModel):
    id: int
    version: str
    created: datetime


class CodeFilterConceptRead(BaseModel):
    concept_id: UUID
    current: CodeRead
    path: list[str]
    historical_names: list[str]
    historical_descriptions: list[str]
    filter_value: str


class CodeFilterVersionRead(BaseModel):
    code: CodeRead
    is_current: bool
    releases: list[CodeFilterReleaseTag]
    filter_value: str


class CodeFilterVersionSummary(BaseModel):
    concept_id: UUID
    current: CodeFilterVersionRead
    released: list[CodeFilterVersionRead]
    recent: list[CodeFilterVersionRead]
    total: int


class PaginatedCodeFilterVersions(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[CodeFilterVersionRead]
