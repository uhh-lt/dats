from datetime import datetime
from typing import Dict, List, Optional

from core.code.code_dto import CodeRead
from core.doc.source_document_dto import SourceDocumentRead
from core.memo.memo_dto import AttachedObjectType, MemoRead
from pydantic import BaseModel, Field
from repos.db.dto_base import UpdateDTOBase


class SpanAnnotationRow(BaseModel):
    id: int = Field(description="ID of the SpanAnnotation")
    span_text: str = Field(description="The SpanText the SpanAnnotation spans.")
    code: CodeRead = Field(description="Code the SpanAnnotation refers to")
    user_id: int = Field(description="User the SpanAnnotation belongs to")
    sdoc: SourceDocumentRead = Field(
        description="SourceDocument the SpanAnnotation refers to"
    )
    tag_ids: List[int] = Field(description="The DocumentTagIDs of the SourceDocument.")
    memo: Optional[MemoRead] = Field(description="The Memo of the Annotation.")


class SpanAnnotationSearchResult(BaseModel):
    total_results: int = Field(
        description="The total number of span_annotation_ids. Used for pagination."
    )
    data: List[SpanAnnotationRow] = Field(description="The Annotations.")


class SentenceAnnotationRow(BaseModel):
    id: int = Field(description="ID of the SentenceAnnotation")
    text: str = Field(description="The Text the SentenceAnnotation spans.")
    code: CodeRead = Field(description="Code the SentenceAnnotation refers to")
    user_id: int = Field(description="User the SentenceAnnotation belongs to")
    sdoc: SourceDocumentRead = Field(
        description="SourceDocument the SentenceAnnotation refers to"
    )
    tag_ids: List[int] = Field(description="The DocumentTagIDs of the SourceDocument.")
    memo: Optional[MemoRead] = Field(description="The Memo of the Annotation.")


class SentenceAnnotationSearchResult(BaseModel):
    total_results: int = Field(
        description="The total number of sentence_annotation_ids. Used for pagination."
    )
    data: List[SentenceAnnotationRow] = Field(description="The Annotations.")


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
    tag_ids: List[int] = Field(description="The DocumentTagIDs of the SourceDocument.")
    memo: Optional[MemoRead] = Field(description="The Memo of the Annotation.")


class BBoxAnnotationSearchResult(BaseModel):
    total_results: int = Field(
        description="The total number of bbox_annotation_ids. Used for pagination."
    )
    data: List[BBoxAnnotationRow] = Field(description="The Annotations.")


class ElasticSearchDocumentCreate(BaseModel):
    filename: str = Field(description="The filename of the SourceDocument")
    content: str = Field(description="The raw text of the SourceDocument")
    sdoc_id: int = Field(
        description="The ID of the SourceDocument as it is in the SQL DB"
    )
    project_id: int = Field(
        description="The ID of the Project the SourceDocument belongs to"
    )
    created: datetime = Field(
        description="The created date of the SourceDocument", default=datetime.now()
    )


class ElasticSearchDocumentRead(BaseModel):
    filename: Optional[str] = Field(description="The filename of the SourceDocument")
    content: Optional[str] = Field(description="The raw text of the SourceDocument")
    sdoc_id: Optional[int] = Field(
        description="The ID of the SourceDocument as it is in the SQL DB"
    )
    project_id: Optional[int] = Field(
        description="The ID of the Project the SourceDocument belongs to"
    )
    created: Optional[datetime] = Field(
        description="The created date of the SourceDocument",
    )


class ElasticSearchDocumentHit(BaseModel):
    id: int = Field(description="The ID of the Document")
    score: Optional[float] = Field(
        description="The score of the Document that was found by a ES Query",
        default=None,
    )
    highlights: list[str] = Field(
        description="The highlights found within the document.", default=[]
    )


class ElasticSearchMemoCreate(BaseModel):
    title: str = Field(description="The title of the Memo")
    content: str = Field(description="The content of the Memo")
    starred: Optional[bool] = Field(
        description="Starred flag of the Memo", default=False
    )
    memo_id: int = Field(description="The ID of the Memo as it is in the SQL DB")
    project_id: int = Field(description="The ID of the Project the Memo belongs to")
    user_id: int = Field(description="The ID of the User the Memo belongs to")
    attached_object_id: int = Field(
        description="The ID of the Object the Memo is attached to"
    )
    attached_object_type: AttachedObjectType = Field(
        description="The type of the Object the Memo is attached to"
    )
    updated: datetime = Field(
        description="The created date of the Memo", default=datetime.now()
    )
    created: datetime = Field(
        description="The created date of the Memo", default=datetime.now()
    )


class ElasticSearchMemoRead(BaseModel):
    title: Optional[str] = Field(description="The title of the Memo")
    content: Optional[str] = Field(description="The content of the Memo")
    starred: Optional[bool] = Field(description="Starred flag of the Memo")
    memo_id: Optional[int] = Field(
        description="The ID of the Memo as it is in the SQL DB"
    )
    project_id: Optional[int] = Field(
        description="The ID of the Project the Memo belongs to"
    )
    user_id: Optional[int] = Field(description="The ID of the User the Memo belongs to")
    attached_object_id: Optional[int] = Field(
        description="The ID of the Object the Memo is attached to"
    )
    attached_object_type: Optional[AttachedObjectType] = Field(
        description=("The type of the Object the Memo is attached to")
    )
    updated: Optional[datetime] = Field(
        description="The created date of the Memo", default=datetime.now()
    )
    created: Optional[datetime] = Field(
        description="The created date of the Memo", default=datetime.now()
    )


class ElasticSearchMemoUpdate(BaseModel, UpdateDTOBase):
    memo_id: int = Field(description="The ID of the Memo as it is in the SQL DB")
    title: Optional[str] = Field(description="The title of the Memo", default=None)
    content: Optional[str] = Field(description="The content of the Memo", default=None)
    starred: Optional[bool] = Field(
        description="Starred flag of the Memo", default=None
    )


class PaginatedElasticSearchDocumentHits(BaseModel):
    hits: List[ElasticSearchDocumentHit] = Field(
        description=(
            "The IDs, scores and (optional) highlights of Document search results on "
            "the requested page."
        )
    )
    total_results: int = Field(
        description="The total number of hits. Used for pagination."
    )


class PaginatedSDocHits(BaseModel):
    hits: List[ElasticSearchDocumentHit] = Field(
        description=(
            "The IDs, scores and (optional) highlights of Document search results on "
            "the requested page."
        )
    )
    sdocs: Dict[int, SourceDocumentRead] = Field(
        description=(
            "A dictionary with the additional information about the documents. The key is the "
            "document ID and the value is a dictionary with the additional information."
        )
    )
    annotators: Dict[int, List[int]] = Field(
        description=(
            "A dictionary with the additional information about the documents. The key is the "
            "document ID and the value is a dictionary with the additional information."
        )
    )
    tags: Dict[int, List[int]] = Field(
        description=(
            "A dictionary with the additional information about the documents. The key is the "
            "document ID and the value is a dictionary with the additional information."
        )
    )
    total_results: int = Field(
        description="The total number of hits. Used for pagination."
    )
