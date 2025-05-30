from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from .dto_base import UpdateDTOBase


# Properties for creation
class TopicCreate(BaseModel):
    parent_topic_id: Optional[int] = Field(
        default=None, description="ID of the parent topic, if any"
    )
    aspect_id: int = Field(description="ID of the aspect this topic belongs to")
    level: int = Field(description="Hierarchical level of the topic")
    name: str = Field(description="Name of the topic")
    description: str = Field(description="Description of the topic")


# Properties for internal creation (if some fields are system-set)
class TopicCreateIntern(BaseModel):
    aspect_id: int = Field(description="ID of the aspect this topic belongs to")
    level: int = Field(description="Hierarchical level of the topic")
    name: Optional[str] = Field(default=None, description="Name of the topic")
    description: Optional[str] = Field(
        default=None, description="Description of the topic"
    )
    parent_topic_id: Optional[int] = Field(
        default=None, description="ID of the parent topic, if any"
    )


# Properties for updating
class TopicUpdate(BaseModel, UpdateDTOBase):
    pass


# Properties for internal update
class TopicUpdateIntern(TopicUpdate):
    parent_topic_id: Optional[int] = Field(
        default=None, description="Updated ID of the parent topic"
    )
    name: Optional[str] = Field(default=None, description="New name of the topic")
    description: Optional[str] = Field(
        default=None, description="New description of the topic"
    )
    x: Optional[float] = Field(
        default=None, description="Updated X coordinate for visualization"
    )
    y: Optional[float] = Field(
        default=None, description="Updated Y coordinate for visualization"
    )
    top_words: Optional[List[str]] = Field(
        default=None, description="Updated top words for the topic"
    )
    top_word_scores: Optional[List[float]] = Field(
        default=None, description="Updated scores of the top words"
    )
    top_docs: Optional[List[int]] = Field(
        default=None, description="Updated IDs of top documents for the topic"
    )


# Properties for reading
class TopicRead(BaseModel):
    id: int = Field(description="ID of the topic")
    aspect_id: int = Field(description="ID of the aspect this topic belongs to")
    parent_topic_id: Optional[int] = Field(description="ID of the parent topic, if any")

    name: str = Field(description="Name of the topic")
    description: str = Field(description="Description of the topic")
    level: int = Field(description="Hierarchical level of the topic")

    x: float = Field(description="X coordinate for visualization")
    y: float = Field(description="Y coordinate for visualization")

    top_words: Optional[List[str]] = Field(
        description="Top words associated with the topic"
    )
    top_word_scores: Optional[List[float]] = Field(
        description="Scores of the top words"
    )
    top_docs: Optional[List[int]] = Field(
        description="IDs of top documents for the topic"
    )

    model_config = ConfigDict(from_attributes=True)
