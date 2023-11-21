from datetime import datetime
from typing import List, Optional, Union

from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.data.dto.memo import AttachedObjectType, MemoRead
from app.core.data.dto.util import PaginatedResults
from pydantic import BaseModel, Field


class MemoQueryBase(BaseModel):
    proj_id: int = Field(
        description="The ID of the Project the Memo have to belong to."
    )
    user_id: int = Field(description="The ID of the User the Memo have to belong to.")
    starred: Optional[bool] = Field(
        description=(
            "If set (i.e. not NULL / NONE), only returns Memo that have the "
            "given starred status"
        ),
        default=None,
    )


class MemoContentQuery(MemoQueryBase):
    content_query: str = Field(
        description="The query term to search within the content of the Memo",
        min_length=1,
    )


class MemoTitleQuery(MemoQueryBase):
    title_query: str = Field(
        description="The query term to search within the title of the Memo",
        min_length=1,
    )
    prefix: bool = Field(
        description="If true, filename prefix search is done. If false exact title is searched."
    )


class ElasticSearchIntegerRange(BaseModel):
    gte: int
    lt: int


class ElasticSearchDocumentCreate(BaseModel):
    filename: str = Field(description="The filename of the SourceDocument")
    content: str = Field(description="The raw text of the SourceDocument")
    html: str = Field(description="The html of the SourceDocument")
    tokens: List[str] = Field(
        description="The list of the tokens in the SourceDocument"
    )
    token_character_offsets: Optional[List[ElasticSearchIntegerRange]] = Field(
        description=(
            "The list of character " "offsets for the tokens " "in the SourceDocument"
        )
    )
    sentences: List[str] = Field(
        description="The list of the sentences in the SourceDocument"
    )
    sentence_character_offsets: Optional[List[ElasticSearchIntegerRange]] = Field(
        description=(
            "The list of character "
            "offsets for the "
            "sentences "
            "in the SourceDocument"
        )
    )
    keywords: List[str] = Field(
        description="The list of keywords of the SourceDocument"
    )
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
    html: Optional[str] = Field(description="The html of the SourceDocument")
    tokens: Optional[List[str]] = Field(
        description="The list of the tokens in the SourceDocument"
    )
    token_character_offsets: Optional[List[ElasticSearchIntegerRange]] = Field(
        description=(
            "The list of character " "offsets for the tokens " "in the SourceDocument"
        )
    )
    sentences: Optional[List[str]] = Field(
        description="The list of the sentences in the SourceDocument"
    )
    sentence_character_offsets: Optional[List[ElasticSearchIntegerRange]] = Field(
        description=(
            "The list of character "
            "offsets for the "
            "sentences "
            "in the SourceDocument"
        )
    )
    keywords: Optional[List[str]] = Field(
        description="The list of keywords of the SourceDocument"
    )
    sdoc_id: Optional[int] = Field(
        description="The ID of the SourceDocument as it is in the SQL DB"
    )
    project_id: Optional[int] = Field(
        description="The ID of the Project the SourceDocument belongs to"
    )
    created: Optional[datetime] = Field(
        description="The created date of the SourceDocument", default=datetime.now()
    )


class ElasticSearchDocumentHit(BaseModel):
    sdoc_id: int = Field(
        description="The ID of the SourceDocument as it is in the SQL DB"
    )
    score: float = Field(
        description="The score of the SourceDocument that was found by a ES Query"
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
        description=("The type of the Object the Memo is " "attached to")
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


class ElasticMemoHit(ElasticSearchMemoRead):
    score: float = Field(
        description="The score of the Memo that was found by a ES Query"
    )


class PaginatedElasticSearchDocumentHits(PaginatedResults):
    hits: List[ElasticSearchDocumentHit] = Field(
        description=(
            "The IDs of SourceDocument search results on " "the requested page."
        )
    )


class PaginatedMemoSearchResults(PaginatedResults):
    memos: List[MemoRead] = Field(
        description="The Memo search results on the requested page."
    )


class SimSearchQuery(BaseModel):
    proj_id: int = Field(
        description="The ID of the Project the SourceDocuments have to belong to."
    )
    query: Union[str, List[str], int] = Field(
        description=(
            "The query term. This can be either a single string, "
            "a list of strings for which the average embedding gets computed, "
            "or an integer which is interpreted as the SDoc ID of an Image."
        )
    )
    top_k: int = Field(
        description="The number of results to return.",
        default=10,
    )
    threshold: float = Field(
        description="The minimum distance to use for the sim search.",
        default=0.0,
        ge=0.0,
        le=1.0,
    )


class SimSearchHit(BaseModel):
    sdoc_id: int = Field(
        description="The ID of the SourceDocument similar to the query."
    )
    score: float = Field(description="The similarity score.")


class SimSearchSentenceHit(SimSearchHit):
    sentence_id: int = Field(
        description="The sentence id with respect to the SourceDocument"
    )


class SimSearchImageHit(SimSearchHit):
    pass
