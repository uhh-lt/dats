from datetime import datetime
from typing import List, Optional, Union

import srsly
from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import field_validator

from app.core.data.dto.dto_base import UpdateDTOBase

####################
# Base Types
####################


class TopicWordInfo(BaseModel):
    word: str = Field(description="Name of the Concept")
    score: float = Field(description="Description of the Concept")


class TopicDocumentInfo(BaseModel):
    doc_name: str = Field(description="Name of the Concept")
    probability: float = Field(description="Description of the Concept")


####################
# TopicInfo DTOs
####################


class TopicInfoBase(BaseModel):
    project_id: int = Field(description="Project the TopicInfo belongs to")
    topic_words: List[TopicWordInfo] = Field(
        description="List of Concepts that are part of the TopicInfo"
    )
    name: str = Field(description="ID of the TopicInfo")
    doc_count: int = Field(description="ID of the TopicInfo")
    topic_documents: List[TopicDocumentInfo] = Field(
        description="List of documents where the topic can be found and the probability"
    )


class TopicInfoCreate(TopicInfoBase):
    pass


class TopicInfoCreateIntern(TopicInfoCreate):
    topic_words: Optional[str] = Field(
        description=(
            "JSON Representation of the list of Concepts that are part of the TopicInfo"
        ),
        default=None,
    )
    topic_documents: Optional[str] = Field(
        description=(
            "JSON Representation of the list of documents that are part of the TopicInfo"
        ),
        default=None,
    )


class TopicInfoUpdateIntern(TopicInfoBase, UpdateDTOBase):
    topic_words: Optional[str] = Field(
        description=(
            "JSON Representation of the list of Concepts that are part of the TopicInfo"
        ),
        default=None,
    )


class TopicInfoRead(TopicInfoBase):
    id: int = Field(description="ID of the TopicInfo")
    created: datetime = Field(description="Created timestamp of the TopicInfo")
    updated: datetime = Field(description="Updated timestamp of the TopicInfo")

    @field_validator("topic_words", mode="before")
    @classmethod
    def json_loads_concepts(cls, v: Union[str, List]) -> List[TopicWordInfo]:
        if isinstance(v, str):
            # v is a JSON string from the DB
            data = srsly.json_loads(v)
            if isinstance(data, List):
                if len(data) == 0:
                    return []
                elif isinstance(data[0], dict):
                    return [TopicWordInfo(**concept) for concept in data]
        elif isinstance(v, List):
            if len(v) == 0:
                return []
            elif isinstance(v[0], dict):
                return [TopicWordInfo(**concept) for concept in v]
            elif isinstance(v[0], TopicWordInfo):
                return v

        raise ValueError(
            "Invalid value for concepts. "
            "Must be a JSON string or a list of TopicInfoConcepts."
        )

    @field_validator("topic_documents", mode="before")
    @classmethod
    def json_loads_documents(cls, v: Union[str, List]) -> List[TopicDocumentInfo]:
        if isinstance(v, str):
            # v is a JSON string from the DB
            data = srsly.json_loads(v)
            if isinstance(data, List):
                if len(data) == 0:
                    return []
                elif isinstance(data[0], dict):
                    return [TopicDocumentInfo(**concept) for concept in data]
        elif isinstance(v, List):
            if len(v) == 0:
                return []
            elif isinstance(v[0], dict):
                return [TopicDocumentInfo(**concept) for concept in v]
            elif isinstance(v[0], TopicDocumentInfo):
                return v

        raise ValueError(
            "Invalid value for concepts. "
            "Must be a JSON string or a list of TopicInfoConcepts."
        )

    model_config = ConfigDict(from_attributes=True)

    def __str__(self) -> str:
        return f"TopicInfoRead(id={self.id}, name={self.name}, project_id={self.project_id}, topic_words={self.topic_words}, topic_documents={self.topic_documents}, created={self.created}, updated={self.updated})"

    def __repr__(self) -> str:
        return str(self)
