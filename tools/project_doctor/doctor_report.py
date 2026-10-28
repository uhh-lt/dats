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


Fix = Annotated[
    DeleteSdocs
    | QuarantinePath
    | ReindexEs
    | DeleteEsDocuments
    | DeleteEsIndex
    | DeleteEmbeddings
    | DeleteWeaviateTenant
    | DeleteAnnotations,
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
