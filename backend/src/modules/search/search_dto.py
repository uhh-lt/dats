from core.code.code_dto import CodeRead
from core.doc.source_document_dto import SourceDocumentRead
from core.memo.memo_dto import MemoRead
from pydantic import BaseModel, Field
from repos.elastic.elastic_dto_base import ElasticSearchHit


class SpanAnnotationRow(BaseModel):
    id: int = Field(description="ID of the SpanAnnotation")
    span_text: str = Field(description="The SpanText the SpanAnnotation spans.")
    code: CodeRead = Field(description="Code the SpanAnnotation refers to")
    user_id: int = Field(description="User the SpanAnnotation belongs to")
    sdoc: SourceDocumentRead = Field(
        description="SourceDocument the SpanAnnotation refers to"
    )
    tag_ids: list[int] = Field(description="The DocumentTagIDs of the SourceDocument.")
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
    tag_ids: list[int] = Field(description="The DocumentTagIDs of the SourceDocument.")
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
    tag_ids: list[int] = Field(description="The DocumentTagIDs of the SourceDocument.")
    memo: MemoRead | None = Field(description="The Memo of the Annotation.")


class BBoxAnnotationSearchResult(BaseModel):
    total_results: int = Field(
        description="The total number of bbox_annotation_ids. Used for pagination."
    )
    data: list[BBoxAnnotationRow] = Field(description="The Annotations.")


class PaginatedSDocHits(BaseModel):
    hits: list[ElasticSearchHit] = Field(
        description=(
            "The IDs, scores and (optional) highlights of Document search results on "
            "the requested page."
        )
    )
    sdocs: dict[int, SourceDocumentRead] = Field(
        description=(
            "A dictionary with the additional information about the documents. The key is the "
            "document ID and the value is a dictionary with the additional information."
        )
    )
    annotators: dict[int, list[int]] = Field(
        description=(
            "A dictionary with the additional information about the documents. The key is the "
            "document ID and the value is a dictionary with the additional information."
        )
    )
    tags: dict[int, list[int]] = Field(
        description=(
            "A dictionary with the additional information about the documents. The key is the "
            "document ID and the value is a dictionary with the additional information."
        )
    )
    total_results: int = Field(
        description="The total number of hits. Used for pagination."
    )
