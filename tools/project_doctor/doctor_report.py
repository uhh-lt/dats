"""The report of the DATS project doctor: the issues found by `check`, and the
fix that `heal` applies for each of them."""

import os
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class CheckName(str, Enum):
    # Postgres <-> filesystem
    MISSING_ORIGINAL_FILE = "missing_original_file"
    MISSING_THUMBNAIL = "missing_thumbnail"
    ORPHANED_FILE = "orphaned_file"
    ORPHANED_PROJECT_DIR = "orphaned_project_dir"
    # Postgres
    MISSING_SDOC_DATA = "missing_sdoc_data"
    FAILED_PROCESSING = "failed_processing"
    CROSS_PROJECT_REFERENCE = "cross_project_reference"
    ANNOTATION_OUT_OF_BOUNDS = "annotation_out_of_bounds"
    # Postgres <-> Elasticsearch
    MISSING_ES_DOCUMENT = "missing_es_document"
    ORPHANED_ES_DOCUMENT = "orphaned_es_document"
    ORPHANED_ES_INDEX = "orphaned_es_index"
    # Postgres <-> Weaviate
    MISSING_EMBEDDINGS = "missing_embeddings"
    ORPHANED_EMBEDDINGS = "orphaned_embeddings"
    ORPHANED_WEAVIATE_TENANT = "orphaned_weaviate_tenant"
    # Data the project export or import of DATS cannot handle
    BLANK_SPAN_TEXT = "blank_span_text"
    BLANK_VALUE = "blank_value"
    EMPTY_SDOC_HTML = "empty_sdoc_html"
    DUPLICATE_FOLDER_NAME = "duplicate_folder_name"
    BROKEN_HIERARCHY = "broken_hierarchy"
    SYSTEM_CODE_CONFLICT = "system_code_conflict"
    METADATA_KEY_CONFLICT = "metadata_key_conflict"
    INVALID_SDOC_METADATA = "invalid_sdoc_metadata"
    INVALID_BBOX = "invalid_bbox"
    NON_MEMBER_AUTHOR = "non_member_author"
    UNSUPPORTED_MEMO_ATTACHMENT = "unsupported_memo_attachment"
    INVALID_MEMO_CONTENT = "invalid_memo_content"
    DANGLING_WHITEBOARD_NODE = "dangling_whiteboard_node"
    INVALID_TIMELINE_FILTER = "invalid_timeline_filter"


# ==============================================================================
# FIXES
# ==============================================================================
class DeleteSdocs(BaseModel):
    """Delete the documents from all stores (with their annotations, tags, ...)."""

    action: Literal["delete_sdocs"] = "delete_sdocs"
    sdoc_ids: list[int]


class QuarantinePath(BaseModel):
    """Move a file or folder out of the DATS filesystem into the quarantine
    folder, from where it can be restored or deleted by hand."""

    action: Literal["quarantine_path"] = "quarantine_path"
    path: str


class ReindexEs(BaseModel):
    """Write the documents' content into their project's Elasticsearch index."""

    action: Literal["reindex_es"] = "reindex_es"
    sdoc_ids: list[int]


class DeleteEsDocuments(BaseModel):
    action: Literal["delete_es_documents"] = "delete_es_documents"
    sdoc_ids: list[int]


class DeleteEsIndex(BaseModel):
    action: Literal["delete_es_index"] = "delete_es_index"
    index: str


class DeleteEmbeddings(BaseModel):
    action: Literal["delete_embeddings"] = "delete_embeddings"
    collection: str
    sdoc_ids: list[int]


class DeleteWeaviateTenant(BaseModel):
    action: Literal["delete_weaviate_tenant"] = "delete_weaviate_tenant"
    collection: str
    tenant: str


class DeleteAnnotations(BaseModel):
    action: Literal["delete_annotations"] = "delete_annotations"
    kind: Literal["span", "sentence", "bbox"]
    ids: list[int]


class SetValues(BaseModel):
    """Set a text column of rows to new values (placeholders, renames). Only the
    columns in doctor_stores.SETTABLE_COLUMNS can be set."""

    action: Literal["set_values"] = "set_values"
    table: str
    column: str
    values: dict[int, str] = Field(description="Row id -> new value")


class SetParents(BaseModel):
    """Set the parent of codes, tags or folders (None: make them roots)."""

    action: Literal["set_parents"] = "set_parents"
    table: Literal["code", "tag", "folder"]
    parents: dict[int, int | None] = Field(description="Row id -> new parent id")


class RepairSpanTexts(BaseModel):
    """Take the text of the span annotations from their document, or delete the
    annotations whose text is blank there as well."""

    action: Literal["repair_span_texts"] = "repair_span_texts"
    ids: list[int]


class ClampBBoxes(BaseModel):
    """Clamp negative coordinates to 0 and order min and max."""

    action: Literal["clamp_bboxes"] = "clamp_bboxes"
    ids: list[int]


class RepairSdocMetadata(BaseModel):
    """Write the default value of its type into metadata without a value, and
    remove NULL elements from list values."""

    action: Literal["repair_sdoc_metadata"] = "repair_sdoc_metadata"
    ids: list[int]


class DeleteSdocMetadata(BaseModel):
    action: Literal["delete_sdoc_metadata"] = "delete_sdoc_metadata"
    ids: list[int]


class DeleteTagLinks(BaseModel):
    action: Literal["delete_tag_links"] = "delete_tag_links"
    links: list[tuple[int, int]] = Field(description="(sdoc id, tag id) pairs")


class AddProjectMembers(BaseModel):
    action: Literal["add_project_members"] = "add_project_members"
    user_ids: list[int]


class ReattachMemos(BaseModel):
    """Attach memos to the project instead of an object the export cannot
    handle."""

    action: Literal["reattach_memos"] = "reattach_memos"
    memo_ids: list[int]


class RepairWhiteboard(BaseModel):
    """Remove the nodes (and their edges) that reference objects outside the
    project, and correct stale parent codes of code nodes."""

    action: Literal["repair_whiteboard"] = "repair_whiteboard"
    whiteboard_id: int


class RepairTimelineFilters(BaseModel):
    """Remove the ids (and the filter expressions) of the timeline analysis
    concepts that the export cannot resolve."""

    action: Literal["repair_timeline_filters"] = "repair_timeline_filters"
    timeline_analysis_id: int


Fix = Annotated[
    DeleteSdocs
    | QuarantinePath
    | ReindexEs
    | DeleteEsDocuments
    | DeleteEsIndex
    | DeleteEmbeddings
    | DeleteWeaviateTenant
    | DeleteAnnotations
    | SetValues
    | SetParents
    | RepairSpanTexts
    | ClampBBoxes
    | RepairSdocMetadata
    | DeleteSdocMetadata
    | DeleteTagLinks
    | AddProjectMembers
    | ReattachMemos
    | RepairWhiteboard
    | RepairTimelineFilters,
    Field(discriminator="action"),
]


# ==============================================================================
# REPORT
# ==============================================================================
class Issue(BaseModel):
    key: str = Field(
        description="Stable id of the issue: heal fixes only the issues whose key "
        "is in the report and that a fresh check still finds"
    )
    check: CheckName
    project_id: int | None = Field(description="None for instance-level issues")
    message: str
    fix: Fix | None = Field(description="None if the issue needs a manual decision")
    hint: str | None = None


class ReportScope(BaseModel):
    project_ids: list[int] | None = Field(description="None means all projects")
    instance: bool = Field(
        description="Whether the instance-level checks ran (leftovers of deleted "
        "projects)"
    )
    min_file_age_minutes: int


class Report(BaseModel):
    created: datetime
    schema_revision: str = Field(description="Alembic revision of the database")
    scope: ReportScope
    issues: list[Issue]

    @staticmethod
    def load(path: Path) -> "Report":
        return Report.model_validate_json(path.read_text(encoding="utf-8"))

    def save(self, path: Path) -> None:
        path.write_text(self.model_dump_json(indent=2), encoding="utf-8")
        # set by dats-doctor.sh, in case its container runs as root
        owner = os.environ.get("DOCTOR_OWNER")
        if owner:
            uid, gid = owner.split(":")
            try:
                os.chown(path, int(uid), int(gid))
            except PermissionError:
                pass  # the container does not run as root, the file is ours anyway
