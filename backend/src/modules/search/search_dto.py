from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

from core.code.code_dto import CodeRead
from core.doc.folder_dto import FolderRead
from core.doc.source_document_dto import SourceDocumentRead
from core.memo.memo_dto import AttachedObjectType
from repos.elastic.elastic_dto_base import ElasticSearchHit
from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering import Filter
from systems.search_system.grouping import GroupConfig
from systems.search_system.sorting import Sort

T = TypeVar("T", bound=AbstractColumns)
ItemT = TypeVar("ItemT", bound=BaseModel)


class Page(BaseModel, Generic[ItemT]):
    """A paginated list of row results.

    Unified row-query response for every searchable entity. `items` holds the
    entity-specific row DTO (e.g. MemoRow, SpanAnnotationRow); `total_results`
    is the unpaginated match count used to drive pagination.
    """

    items: list[ItemT] = Field(description="The rows on the requested page")
    total_results: int = Field(
        description="Total number of matching rows (unpaginated), used for pagination"
    )


class QueryRequest(BaseModel, Generic[T]):
    """Unified row-query request for every searchable entity.

    - `filter`: the column filter tree applied to the entity's subquery.
    - `sorts`: ordered sort expressions; empty means the entity's default sort.
    - `group_by` + `group_key`: optional drill-down. When both are set, results are
      restricted to the single group identified by `group_key` (the group is defined
      by `group_by`). `group_by` without `group_key` has no effect on a row query.
    """

    project_id: int = Field(description="Project the search runs in")
    search_query: str = Field(default="", description="Full-text query")
    filter: Filter[T] = Field(description="Column filter tree")
    sorts: list[Sort[T]] = Field(
        default=[],
        description="Ordered sort expressions; empty means the entity's default sort",
    )
    group_by: GroupConfig[T] | None = Field(
        default=None,
        description="Grouping definition; together with `group_key`, restricts "
        "results to one group (drill-down).",
    )
    group_key: str | None = Field(
        default=None,
        description="Key of the single group to drill into (requires `group_by`).",
    )
    page_number: int = Field(default=0, ge=0, description="Zero-based page index")
    page_size: int = Field(
        default=20, ge=1, le=200, description="Number of rows per page"
    )


class MemoRow(BaseModel):
    """Row item DTO for memo search results (the `items` of a Page[MemoRow])."""

    id: int = Field(description="ID of the Memo")
    title: str = Field(description="Title of the Memo")
    icon: str | None = Field(description="Icon of the Memo")
    content_excerpt: str = Field(description="Short excerpt of the Memo's content")
    user_id: int = Field(description="User who authored the Memo")
    project_id: int = Field(description="Project the Memo belongs to")
    created: datetime = Field(description="Created timestamp of the Memo")
    updated: datetime = Field(description="Updated timestamp of the Memo")
    is_favorite: bool = Field(description="Whether the Memo is marked as favorite")
    attached_object_id: int = Field(
        description="ID of the object the Memo is attached to"
    )
    attached_object_type: AttachedObjectType = Field(
        description="Type of the object the Memo is attached to"
    )


class SpanAnnotationRow(BaseModel):
    id: int = Field(description="ID of the SpanAnnotation")
    span_text: str = Field(description="The SpanText the SpanAnnotation spans.")
    code: CodeRead = Field(description="Code the SpanAnnotation refers to")
    user_id: int = Field(description="User the SpanAnnotation belongs to")
    sdoc: SourceDocumentRead = Field(
        description="SourceDocument the SpanAnnotation refers to"
    )
    tag_ids: list[int] = Field(description="The TagIDs of the SourceDocument.")
    memo_ids: list[int] = Field(
        description="The IDs of the Memos attached to the Annotation."
    )


class SentenceAnnotationRow(BaseModel):
    id: int = Field(description="ID of the SentenceAnnotation")
    text: str = Field(description="The Text the SentenceAnnotation spans.")
    code: CodeRead = Field(description="Code the SentenceAnnotation refers to")
    user_id: int = Field(description="User the SentenceAnnotation belongs to")
    sdoc: SourceDocumentRead = Field(
        description="SourceDocument the SentenceAnnotation refers to"
    )
    tag_ids: list[int] = Field(description="The TagIDs of the SourceDocument.")
    memo_ids: list[int] = Field(
        description="The IDs of the Memos attached to the Annotation."
    )


class BBoxAnnotationRow(BaseModel):
    id: int = Field(description="ID of the BBoxAnnotation")
    x: int = Field(description="The x-coordinate of the BBoxAnnotation.")
    y: int = Field(description="The y-coordinate of the BBoxAnnotation.")
    width: int = Field(description="The width of the BBoxAnnotation.")
    height: int = Field(description="The height of the BBoxAnnotation.")
    url: str = Field(description="The url to the Image of the BBoxAnnotation.")
    code: CodeRead = Field(description="Code the BBoxAnnotation refers to")
    user_id: int = Field(description="User the BBoxAnnotation belongs to")
    sdoc: SourceDocumentRead = Field(
        description="SourceDocument the BBoxAnnotation refers to"
    )
    tag_ids: list[int] = Field(description="The TagIDs of the SourceDocument.")
    memo_ids: list[int] = Field(
        description="The IDs of the Memos attached to the Annotation."
    )


class HierarchicalElasticSearchHit(ElasticSearchHit):
    is_folder: bool = Field(
        description="Indicates if the hit is a folder (True) or a document (False).",
    )
    sub_rows: list["HierarchicalElasticSearchHit"] = Field(
        description="Sub-rows of the hit, if it is a folder."
    )


class PaginatedSDocHits(BaseModel):
    hits: list[HierarchicalElasticSearchHit] = Field(
        description=(
            "The IDs, scores and (optional) highlights of Document search results on "
            "the requested page."
        )
    )
    sdocs: dict[int, SourceDocumentRead] = Field(
        description=("A dictionary of sdoc_id and SourceDocumentRead.")
    )
    sdoc_folders: dict[int, FolderRead] = Field(
        description=("A dictionary of folder_id and FolderRead.")
    )
    annotators: dict[int, list[int]] = Field(
        description=(
            "A dictionary of sdoc_id and a list of annotator user IDs that annotated the document."
        )
    )
    tags: dict[int, list[int]] = Field(
        description=(
            "A dictionary of sdoc_id and a list of tag IDs that are associated with the document."
        )
    )
    memos: dict[int, list[int]] = Field(
        description=(
            "A dictionary of sdoc_id and a list of memo IDs that are attached to the document."
        )
    )

    total_results: int = Field(
        description="The total number of hits. Used for pagination."
    )
