import re
from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from core.code.code_dto import CodeChangedField, CodeRead

SEMANTIC_VERSION_PATTERN = re.compile(
    r"^(0|[1-9]\d*)\."
    r"(0|[1-9]\d*)\."
    r"(0|[1-9]\d*)"
    r"(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)"
    r"(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?"
    r"(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$"
)


class CodebookReleaseCreate(BaseModel):
    project_id: int
    version: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=10_000)

    @field_validator("version")
    @classmethod
    def normalize_version(cls, value: str) -> str:
        normalized = value.strip()
        if normalized.lower().startswith("v"):
            normalized = normalized[1:]
        if not SEMANTIC_VERSION_PATTERN.fullmatch(normalized):
            raise ValueError(
                "Version must be semantic, for example 1.2.0 or 1.2.0-beta.1"
            )
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class CodebookReleaseRead(BaseModel):
    id: int
    project_id: int
    version: str
    description: str | None
    created: datetime
    code_count: int
    previous_release_id: int | None = Field(
        description="Immediately preceding release in project chronology"
    )


class PaginatedCodebookReleases(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[CodebookReleaseRead]


class CodebookReleaseTreeRead(BaseModel):
    release: CodebookReleaseRead
    codes: list[CodeRead]


class CodebookReleaseChangeType(str, Enum):
    ADDED = "added"
    MODIFIED = "modified"
    REMOVED = "removed"


class CodebookReleaseComparisonChange(BaseModel):
    concept_id: UUID
    change_type: CodebookReleaseChangeType
    before: CodeRead | None
    after: CodeRead | None
    changed_fields: list[CodeChangedField]


class CodebookReleaseComparisonRead(BaseModel):
    base_release: CodebookReleaseRead
    target_release: CodebookReleaseRead | None
    target_is_latest: bool
    added_count: int
    modified_count: int
    removed_count: int
    unchanged_count: int
    changes: list[CodebookReleaseComparisonChange]
