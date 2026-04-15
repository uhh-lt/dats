from pydantic import BaseModel, Field

from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.code.code_dto import CodeRead
from core.doc.folder_dto import FolderRead
from core.doc.source_document_dto import SourceDocumentRead
from core.memo.memo_dto import MemoRead
from repos.elastic.elastic_dto_base import ElasticSearchHit


class SpanAnnotationRow(BaseModel):
    id: int = Field(description="ID of the SpanAnnotation")
    span_text: str = Field(description="The SpanText the SpanAnnotation spans.")
    code: CodeRead = Field(description="Code the SpanAnnotation refers to")
    user_id: int = Field(description="User the SpanAnnotation belongs to")
    sdoc: SourceDocumentRead = Field(
        description="SourceDocument the SpanAnnotation refers to"
    )
    tag_ids: list[int] = Field(description="The TagIDs of the SourceDocument.")
    memo: MemoRead | None = Field(description="The Memo of the Annotation.")


class SpanAnnotationSearchResult(BaseModel):
    total_results: int = Field(
        description="The total number of span_annotation_ids. Used for pagination."
    )
    data: list[SpanAnnotationRow] = Field(description="The Annotations.")


class SentenceAnnotationRow(BaseModel):
    id: int = Field(description="ID of the SentenceAnnotation")
    text: str = Field(description="The Text the SentenceAnnotation spans.")
    code: CodeRead = Field(description="Code the SentenceAnnotation refers to")
    user_id: int = Field(description="User the SentenceAnnotation belongs to")
    sdoc: SourceDocumentRead = Field(
        description="SourceDocument the SentenceAnnotation refers to"
    )
    tag_ids: list[int] = Field(description="The TagIDs of the SourceDocument.")
    memo: MemoRead | None = Field(description="The Memo of the Annotation.")


class SentenceAnnotationSearchResult(BaseModel):
    total_results: int = Field(
        description="The total number of sentence_annotation_ids. Used for pagination."
    )
    data: list[SentenceAnnotationRow] = Field(description="The Annotations.")


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
    memo: MemoRead | None = Field(description="The Memo of the Annotation.")


class BBoxAnnotationSearchResult(BaseModel):
    total_results: int = Field(
        description="The total number of bbox_annotation_ids. Used for pagination."
    )
    data: list[BBoxAnnotationRow] = Field(description="The Annotations.")


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

    total_results: int = Field(
        description="The total number of hits. Used for pagination."
    )


class SpanAnnotationHit(BaseModel):
    span_dto: SpanAnnotationCreate = Field(
        description="The DTO needed to create the SpanAnnotation."
    )
    before_context: str = Field(description="The context before the span.")
    after_context: str = Field(description="The context after the span.")


class PaginatedSpanAnnotationHits(BaseModel):
    total_results: int = Field(
        description="The total number of SpanAnnotation hits. Used for pagination."
    )
    hits: list[SpanAnnotationHit] = Field(
        description=("The SpanAnnotation hits matching the search query.")
    )
