from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase
from utils.color_utils import get_next_color


class CodeBaseDTO(BaseModel):
    name: str = Field(description="Name of the Code")
    color: str = Field(description="Color of the Code")
    description: str = Field(description="Description of the Code", default="")
    parent_concept_id: UUID | None = Field(
        description="Logical parent concept of the Code", default=None
    )
    enabled: bool = Field(
        default=True,
        description="Whether the code is available for annotation and preprocessing",
    )


class CodeChangeKind(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    MERGE = "merge"
    CONFLICT_RESOLUTION = "conflict_resolution"


class CodeCreate(CodeBaseDTO):
    project_id: int = Field(description="Project the Code belongs to")
    color: str = Field(description="Color of the Code", default_factory=get_next_color)
    is_system: bool = Field(description="Is the Code a system code", default=False)
    branch_id: int | None = Field(
        description="Target branch; null creates the Code on Main", default=None
    )
    commit_message: str | None = Field(default=None)


class CodeUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(description="Name of the Code", default=None)
    color: str | None = Field(description="Color of the Code", default=None)
    description: str | None = Field(description="Description of the Code", default=None)
    parent_concept_id: UUID | None = Field(
        description="Logical parent concept of the Code", default=None
    )
    enabled: bool | None = Field(default=None)
    branch_id: int | None = Field(
        description="Target branch; null targets Main", default=None
    )
    commit_message: str | None = Field(default=None)


class CodeRead(CodeBaseDTO):
    id: int = Field(description="Snapshot ID of the Code")
    concept_id: UUID = Field(description="Logical identity of the Code")
    project_id: int = Field(description="Project the Code belongs to")
    branch_id: int | None = Field(description="Branch containing this snapshot")
    base_main_code_id: int | None = Field(description="Main merge base snapshot")
    is_active: bool = Field(description="Whether this is the active scope snapshot")
    is_deleted: bool = Field(description="Whether this snapshot is a tombstone")
    author_id: int | None = Field(description="Author of this snapshot")
    commit_message: str | None = Field(description="Optional change note")
    change_set_id: UUID = Field(description="Operation that produced this snapshot")
    change_kind: CodeChangeKind = Field(description="Kind of codebook operation")
    previous_code_id: int | None = Field(
        description="Snapshot used as the before state for this change"
    )
    merged_from_code_id: int | None = Field(
        description="Branch snapshot promoted by this Main merge snapshot"
    )
    created: datetime = Field(description="Created timestamp of the snapshot")
    updated: datetime = Field(description="Updated timestamp of the snapshot")
    is_system: bool = Field(description="Is the Code a system code")
    memo_ids: list[int] = Field(description="Memo IDs attached to this snapshot")
    model_config = ConfigDict(from_attributes=True)


class CodeDeleteStrategy(str, Enum):
    CASCADE = "cascade"
    LIFT_CHILDREN = "lift_children"


class CodeDelete(BaseModel):
    branch_id: int | None = None
    strategy: CodeDeleteStrategy
    commit_message: str | None = None


class CodeMerge(BaseModel):
    concept_ids: list[UUID] | None = Field(
        default=None,
        description="Concepts to merge; null merges every active branch change",
    )
    commit_message: str | None = None


class CodeConflictResolution(str, Enum):
    KEEP_BRANCH = "keep_branch"
    DISCARD_BRANCH = "discard_branch"


class CodeResolveConflict(BaseModel):
    concept_id: UUID
    resolution: CodeConflictResolution
    commit_message: str | None = None


class CodeMergeResult(BaseModel):
    merged: list[CodeRead]
    discarded_concept_ids: list[UUID] = Field(default_factory=list)


class CodeBranchChangeType(str, Enum):
    ADDED = "added"
    MODIFIED = "modified"
    DELETED = "deleted"


class CodeChangedField(str, Enum):
    NAME = "name"
    COLOR = "color"
    DESCRIPTION = "description"
    PARENT_CONCEPT_ID = "parent_concept_id"
    ENABLED = "enabled"
    IS_DELETED = "is_deleted"


class CodeChangelogChange(BaseModel):
    before: CodeRead | None
    after: CodeRead
    merged_from: CodeRead | None
    changed_fields: list[CodeChangedField]


class CodeChangelogEntry(BaseModel):
    change_set_id: UUID
    change_kind: CodeChangeKind
    message: str | None
    author_id: int | None
    created: datetime
    branch_id: int | None = Field(description="Target branch; null means Main")
    source_branch_id: int | None = Field(
        description="Source branch for a merge into Main"
    )
    changes: list[CodeChangelogChange]


class PaginatedCodeChangelog(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[CodeChangelogEntry]


class CodeBranchChangeRead(BaseModel):
    concept_id: UUID
    change_type: CodeBranchChangeType
    changed_fields: list[CodeChangedField]
    branch_code: CodeRead
    base_main_code: CodeRead | None
    current_main_code: CodeRead | None
    is_conflict: bool


class CodeMergeConflictResponse(BaseModel):
    message: str
    concept_ids: list[UUID]


class CodeSnapshotsRequest(BaseModel):
    project_id: int
    code_ids: list[int] = Field(min_length=1, max_length=500)
