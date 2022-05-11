from datetime import datetime
from typing import Set, Optional, List

from pydantic import BaseModel, Field

from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.memo import AttachedObjectType
from app.core.data.dto.source_document import SourceDocumentRead


class SpanEntity(BaseModel):
    code_id: int = Field(description="The ID of the Code related to the SpanAnnotation")
    span_text: str = Field(description="The SpanText the SpanAnnotation spans")


class SpanEntityStat(BaseModel):
    sdoc_id: int = Field(description="The ID of the SourceDocument.")
    span_entity: SpanEntity = Field(description="The counted SpanEntity.")
    count: int = Field(description="Number of occurrences of the SpanEntity in the SourceDocument.")


class SpanEntityStatsQueryParameters(BaseModel):
    proj_id: int = Field(description="The ID of the Project the SourceDocuments have to belong to.")
    sdoc_ids: Set[int] = Field(description="List of IDs of SourceDocuments the stats are computed for.")


class SearchSDocsQueryParameters(BaseModel):
    proj_id: int = Field(description="The ID of the Project the SourceDocuments have to belong to.")

    user_ids: Optional[Set[int]] = Field(description="The IDs of the User the SourceDocuments have to belong to.",
                                         default={SYSTEM_USER_ID})

    span_entities: Optional[List[SpanEntity]] = Field(description=("List of SpanEntities that have to be present in"
                                                                   " the SourceDocuments"), default=None)

    tag_ids: Optional[List[int]] = Field(description=("List of IDs of DocumentTags the SourceDocuments have to be"
                                                      " tagged with"),
                                         default=None)

    all_tags: Optional[bool] = Field(description=("If true return SourceDocuments tagged with all DocumentTags, or any"
                                                  "of the DocumentTags otherwise"), default=False)


class ElasticSearchDocumentCreate(BaseModel):
    filename: str = Field(description="The filename of the SourceDocument")
    content: str = Field(description="The raw text of the SourceDocument")
    tokens: List[str] = Field(description="The list of the tokens in the SourceDocument")
    keywords: List[str] = Field(description="The list of keywords of the SourceDocument")
    sdoc_id: int = Field(description="The ID of the SourceDocument as it is in the SQL DB")
    project_id: int = Field(description="The ID of the Project the SourceDocument belongs to")
    created: datetime = Field(description="The created date of the SourceDocument", default=datetime.now())


class ElasticSearchDocumentRead(BaseModel):
    filename: Optional[str] = Field(description="The filename of the SourceDocument")
    content: Optional[str] = Field(description="The raw text of the SourceDocument")
    tokens: Optional[List[str]] = Field(description="The list of the tokens in the SourceDocument")
    keywords: Optional[List[str]] = Field(description="The list of keywords of the SourceDocument")
    sdoc_id: Optional[int] = Field(description="The ID of the SourceDocument as it is in the SQL DB")
    project_id: Optional[int] = Field(description="The ID of the Project the SourceDocument belongs to")
    created: Optional[datetime] = Field(description="The created date of the SourceDocument", default=datetime.now())


class ElasticSearchDocumentHit(ElasticSearchDocumentRead):
    score: float = Field(description="The score of the SourceDocument that was found by a ES Query")


class ElasticSearchMemoCreate(BaseModel):
    title: str = Field(description="The title of the Memo")
    content: str = Field(description="The content of the Memo")
    memo_id: int = Field(description="The ID of the Memo as it is in the SQL DB")
    project_id: int = Field(description="The ID of the Project the Memo belongs to")
    user_id: int = Field(description="The ID of the User the Memo belongs to")
    attached_object_id: int = Field(description="The ID of the Object the Memo is attached to")
    attached_object_type: AttachedObjectType = Field(description="The type of the Object the Memo is attached to")
    updated: datetime = Field(description="The created date of the Memo", default=datetime.now())
    created: datetime = Field(description="The created date of the Memo", default=datetime.now())


class ElasticSearchMemoRead(BaseModel):
    title: Optional[str] = Field(description="The title of the Memo")
    content: Optional[str] = Field(description="The content of the Memo")
    memo_id: Optional[int] = Field(description="The ID of the Memo as it is in the SQL DB")
    project_id: Optional[int] = Field(description="The ID of the Project the Memo belongs to")
    user_id: Optional[int] = Field(description="The ID of the User the Memo belongs to")
    attached_object_id: Optional[int] = Field(description="The ID of the Object the Memo is attached to")
    attached_object_type: Optional[AttachedObjectType] = Field(description=("The type of the Object the Memo is "
                                                                            "attached to"))
    updated: Optional[datetime] = Field(description="The created date of the Memo", default=datetime.now())
    created: Optional[datetime] = Field(description="The created date of the Memo", default=datetime.now())


class ElasticMemoHit(ElasticSearchMemoRead):
    score: float = Field(description="The score of the Memo that was found by a ES Query")


class PaginatedSourceDocumentSearchResults(BaseModel):
    sdocs: List[SourceDocumentRead] = Field(description="The search results.")
    has_more: bool = Field(description="Flag that indicates whether there are more search results.")
    current_page_offset: int = Field(description="The offset that returns the current results.")
    next_page_offset: int = Field(description="The offset that returns the next results.")
