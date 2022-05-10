from typing import Set, Optional, List

from pydantic import BaseModel, Field

from app.core.data.crud.user import SYSTEM_USER_ID


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
