from datetime import datetime

from pydantic import BaseModel, Field

from core.memo.memo_dto import AttachedObjectType
from repos.elastic.elastic_dto_base import (
    ElasticSearchModelBase,
)


class ElasticSearchMemo(ElasticSearchModelBase):
    title: str = Field(description="The title of the Memo")
    content: str = Field(description="The content of the Memo")
    starred: bool | None = Field(description="Starred flag of the Memo", default=False)
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

    def get_id(self) -> int:
        """
        Returns the ID of the ElasticSearchObject as it is in the SQL DB.
        """
        return self.memo_id


class ElasticSearchMemoCreate(ElasticSearchMemo):
    pass


class ElasticSearchMemoUpdate(BaseModel):
    title: str | None = Field(description="The title of the Memo", default=None)
    content: str | None = Field(description="The content of the Memo", default=None)
    starred: bool | None = Field(description="Starred flag of the Memo", default=None)
